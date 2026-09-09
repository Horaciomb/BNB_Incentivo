# -*- coding: utf-8 -*-
"""
Roster de vendedores desde la planilla de Personal (Google Sheets publicado).

Por que existe, y por que no se lee dim_ejecutivo: la planilla es **por
contrato** (480 filas, 410 personas, 52 con mas de uno, hasta 5) y
dim_ejecutivo es **por persona**. De esa diferencia sale todo lo demas --
fechas de ingreso viejas, gente ausente, y sobre todo los reingresos: medido el
2026-08-10, la planilla ve 52 reingresos y `dias_antiguedad_previa` ve 32. En la
cohorte de junio, las 10 personas que dim_ejecutivo tiene de mas son EXACTAMENTE
reingresos que la dimension no distingue.

El lector (descarga + ubicar la hoja por contenido + cache) es una copia del de
P2 (`P2_conciliacion/ejecutar.py::cargar_personal`). Se copia y no se refactoriza
P2 a proposito: P2 corre todas las semanas y ya esta validado con JP, y no vale
meterle riesgo para beneficiar a P9. Es el mismo criterio con el que
`formatear_columnas_texto` se extrajo aca y P1 conservo su copia. Si un tercer
proceso necesita la planilla, ahi si conviene unificar.

Ver docs/superpowers/specs/2026-08-10-p9-regla-bono-design.md
"""

import os
import time
import unicodedata
from datetime import date, datetime
from datetime import time as _hora_sin_fecha
from io import BytesIO

import pandas as pd
import requests

from .config import CODIGOS_HTTP_REINTENTABLES, DAT_DIR

URL_PERSONAL = os.environ.get(
    "URL_PERSONAL",
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQB6DCg4iadx99qXQTmQ0ftmo"
    "N-6V258gTwUuiF1lFgae0E1IqJnegtCvzL5UGDaR0uZyuMZ1iLJoFY/pub?output=xlsx",
)

# Mismo archivo que usa P2: es la misma URL y el mismo contenido, y dos copias
# del mismo archivo terminan divergiendo. Se escribe la hoja TAL COMO VIENE, sin
# normalizar valores -- P2 aplica su propia normalizacion al leerlo, y si aca se
# guardara un frame ya procesado P2 se romperia sin que nada lo avise.
CACHE = DAT_DIR / "cache" / "personal.xlsx"

HOJA_PREFERIDA = "estructura de personal"
COLUMNA_LLAVE = "celular"
MAX_FILAS_ENCABEZADO = 8

# El codigo_bex es el celular: 8 digitos, sin ceros a la izquierda ni separadores
# (verificado sobre los 715 codigos de bnb_bd y los 319 de bille_bd, 0 excepciones).
# Lo que no tenga esta forma no se puede cruzar contra las afiliaciones.
LARGO_CELULAR = 8

DIAS_CACHE_VIEJO = 7

# Rango en el que una fecha de ingreso es creible. Fuera de esto es dato malo,
# y el caso tipico no es un tipeo sino un SERIAL DE EXCEL: la celda trae 46184 en
# vez de una fecha, pd.to_datetime lo lee como nanosegundos y devuelve
# 1970-01-01 SIN ERROR. Con esa fecha la ventana del hito cae en 1970, la
# persona se evalua con cero afiliaciones y se le niega el bono en silencio.
# Es la misma trampa que documenta el proyecto de RRHH para FECHA DE NACIMIENTO.
FECHA_MIN_CREIBLE = date(2015, 1, 1)

# Rango de seriales de Excel plausibles: 2015-01-01 a 2035-12-31.
SERIAL_EXCEL_MIN, SERIAL_EXCEL_MAX = 42005, 49673
ORIGEN_EXCEL = "1899-12-30"

# La FECHA DE NACIMIENTO necesita su propio rango de seriales: un nacimiento de
# 1989 es el serial 32707, muy por debajo de SERIAL_EXCEL_MIN, asi que con el
# rango de ingreso no se convertiria nunca. 14612 = 1940-01-01, 40544 = 2011-01-01.
SERIAL_NACIMIENTO_MIN, SERIAL_NACIMIENTO_MAX = 14612, 40544
NACIMIENTO_MIN_CREIBLE = date(1940, 1, 1)
EDAD_MINIMA = 15

# Avisos que pueden hacer que alguien no aparezca o que su ventana quede corrida
# -> fuerzan codigo de salida 1. El resto es suciedad que no mueve plata.
TIPOS_ALERTA = {
    "PLANILLA_SIN_CELULAR",
    "PLANILLA_CELULAR_INVALIDO",
    "PLANILLA_BAJA_ANTES_DEL_INGRESO",
    "PLANILLA_FECHA_IMPOSIBLE",
    "CACHE_PLANILLA_VIEJO",
}

COLUMNAS_ROSTER = [
    "codigo_bex",
    "nombre",
    "ci",
    "ciudad",
    "cargo",
    "campana",
    "supervisor",
    "estado",
    "fecha_ingreso",
    "fecha_baja",
    "n_contratos",
]


# =============================================================================
# Lectura de la planilla
# =============================================================================


def _sin_tildes(texto) -> str:
    return unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode().strip().lower()


def _parsear_hoja(xls: pd.ExcelFile, hoja: str):
    """
    Ubica la fila de encabezados dentro de las primeras MAX_FILAS_ENCABEZADO:
    las planillas publicadas suelen traer titulo, logo o filas en blanco arriba.
    Devuelve None si la hoja no tiene la columna llave, para que el llamador
    siga probando con la siguiente.
    """
    cabecera = xls.parse(hoja, header=None, nrows=MAX_FILAS_ENCABEZADO)
    for i in range(len(cabecera)):
        fila = [str(v).strip().lower() for v in cabecera.iloc[i].tolist()]
        if COLUMNA_LLAVE in fila:
            df = xls.parse(hoja, header=i)
            df.columns = df.columns.astype(str).str.lower().str.strip()
            return df
    return None


def _leer_planilla(contenido: bytes) -> pd.DataFrame:
    """
    La hoja que realmente tiene la columna 'celular', buscada por CONTENIDO.

    Nunca por nombre de hoja: si la planilla cambia de hoja, un read_excel a
    nombre fijo lanza ValueError, y ese ValueError termina degradando al cache
    de la planilla ANTERIOR sin decir que cambio de fuente.
    """
    xls = pd.ExcelFile(BytesIO(contenido))
    nombres = list(xls.sheet_names)
    preferidas = [h for h in nombres if str(h).strip().lower() == HOJA_PREFERIDA]

    for hoja in preferidas + [h for h in nombres if h not in preferidas]:
        df = _parsear_hoja(xls, hoja)
        if df is not None:
            if hoja not in preferidas:
                print(f"      [*] Planilla: usando la hoja '{hoja}' (no existe '{HOJA_PREFERIDA}')")
            return df

    raise ValueError(
        f"Ninguna hoja de la planilla tiene columna '{COLUMNA_LLAVE}' en sus "
        f"primeras {MAX_FILAS_ENCABEZADO} filas. Hojas: {nombres}"
    )


def descargar_planilla(max_intentos: int = 3, timeout: int = 60) -> tuple:
    """
    Devuelve (DataFrame, avisos). Online primero, cache despues.

    Si no hay ninguno de los dos, LANZA. No devuelve un frame vacio: P9 calcula
    plata con esto, y un roster vacio silencioso significa "no se habilita
    nadie", que es indistinguible de un corte legitimo sin habilitados.
    """
    avisos = []
    for intento in range(max_intentos):
        try:
            r = requests.get(URL_PERSONAL, timeout=timeout)
            r.raise_for_status()
            df = _leer_planilla(r.content)
            CACHE.parent.mkdir(parents=True, exist_ok=True)
            df.to_excel(CACHE, index=False)
            return df, avisos
        except requests.exceptions.HTTPError as e:
            # raise_for_status lanza HTTPError, que NO es Timeout ni
            # ConnectionError: sin esta rama caia en el except de abajo y hacia
            # break, o sea que el 400 transitorio de Google no se reintentaba
            # nunca. Ver CODIGOS_HTTP_REINTENTABLES en comun/config.py.
            codigo = e.response.status_code if e.response is not None else None
            if codigo not in CODIGOS_HTTP_REINTENTABLES:
                print(f"      [!] HTTP {codigo} permanente, no se reintenta: {e}")
                break
            print(f"      [!] Intento {intento + 1}/{max_intentos}: HTTP {codigo}")
            if intento < max_intentos - 1:
                time.sleep(5)
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            print(f"      [!] Intento {intento + 1}/{max_intentos}: {e}")
            if intento < max_intentos - 1:
                time.sleep(5)
        except Exception as e:
            print(f"      [!] Error leyendo la planilla: {e}")
            break

    if CACHE.exists():
        mtime = datetime.fromtimestamp(CACHE.stat().st_mtime)
        dias = (datetime.now() - mtime).days
        print(f"      [*] Usando cache de la planilla ({mtime:%Y-%m-%d}, {dias} dias)")
        if dias > DIAS_CACHE_VIEJO:
            avisos.append(
                {
                    "TIPO": "CACHE_PLANILLA_VIEJO",
                    "CAMPAÑA": "",
                    "CLAVE": "",
                    "CODIGO BEX": "",
                    "DETALLE": f"cache del {mtime:%Y-%m-%d}, {dias} dias de antiguedad",
                    "IMPACTO": "las fechas de ingreso pueden estar desactualizadas",
                }
            )
        df = pd.read_excel(CACHE)
        df.columns = df.columns.astype(str).str.lower().str.strip()
        return df, avisos

    raise RuntimeError(
        "No se pudo leer la planilla de Personal ni online ni desde cache "
        f"({CACHE}). P9 no calcula el bono con otro roster: hacerlo con "
        "dim_ejecutivo daria fechas de ingreso viejas y no distinguiria "
        "reingresos, o sea pagaria mal."
    )


# =============================================================================
# Roster por persona
# =============================================================================


def _columna(df: pd.DataFrame, *candidatos):
    """Ubica una columna ignorando tildes y mayusculas ('campaña' -> 'campana')."""
    mapa = {_sin_tildes(c): c for c in df.columns}
    for c in candidatos:
        if _sin_tildes(c) in mapa:
            return mapa[_sin_tildes(c)]
    return None


def _parsear_fechas(
    serie: pd.Series,
    serial_min: int = SERIAL_EXCEL_MIN,
    serial_max: int = SERIAL_EXCEL_MAX,
) -> pd.Series:
    """
    Fechas de la planilla, contemplando los seriales de Excel.

    `pd.to_datetime` sobre un serial (46184) lo interpreta como nanosegundos y
    devuelve 1970-01-01 sin lanzar nada. Aca se detectan primero los numericos
    dentro del rango de seriales plausibles y se convierten con el origen de
    Excel; el resto va por el camino normal.

    El rango de seriales es parametrico porque la fecha de nacimiento vive en
    otro siglo que la de ingreso; los defaults son los del ingreso, que es lo
    que usa P9.
    """
    num = pd.to_numeric(serie, errors="coerce")
    es_serial = num.between(serial_min, serial_max)

    # `errors="coerce"` no alcanza para las celdas datetime.time(0, 0) que trae
    # la planilla: pandas las convierte a la fecha de hoy en vez de descartarlas,
    # y una fecha de nacimiento de hoy pasa cualquier filtro de rango.
    limpia = serie.where(~serie.map(lambda v: isinstance(v, _hora_sin_fecha)))
    fechas = pd.to_datetime(limpia.where(~es_serial), errors="coerce")
    if es_serial.any():
        fechas = fechas.fillna(pd.to_datetime(num.where(es_serial), unit="D", origin=ORIGEN_EXCEL))
    return fechas


def _normalizar_celular(valor) -> str:
    """Solo digitos, sin el '.0' que mete Excel y sin ceros a la izquierda."""
    txt = str(valor).strip()
    if txt.endswith(".0"):
        txt = txt[:-2]
    return "".join(c for c in txt if c.isdigit()).lstrip("0")


def cargar_roster_contratos(corte: date, max_intentos: int = 3) -> tuple:
    """
    Una fila por persona, derivada de sus contratos con ingreso <= corte.

    Devuelve (DataFrame[COLUMNAS_ROSTER], avisos).

    `fecha_ingreso` es la del PRIMER contrato, no la del ultimo: el bono premia
    los primeros 7 y 30 dias de alguien que recien empieza. Para un elegible es
    el unico contrato que tiene, asi que en la practica min y max coinciden --
    se escribe asi para que la regla no se rompa si manana cambia el criterio de
    elegibilidad.

    `n_contratos` es el criterio de reingreso: mas de uno y la persona no es un
    vendedor nuevo. Reemplaza a dim_ejecutivo.dias_antiguedad_previa, que es un
    dato que RRHH mantiene a mano y que ve 32 de los 52 reingresos reales.

    Los contratos posteriores al corte no se miran: al corte de junio, alguien
    con un segundo contrato que arranca en septiembre ERA un vendedor nuevo, y
    asi queda registrado en el ledger.
    """
    df, avisos = descargar_planilla(max_intentos=max_intentos)

    c_cel = _columna(df, "celular")
    c_ing = _columna(df, "fecha de ingreso")
    c_sal = _columna(df, "fecha de salida")
    if c_cel is None or c_ing is None:
        raise ValueError(f"La planilla no tiene 'celular' y/o 'fecha de ingreso'. Columnas: {list(df.columns)}")

    d = df.copy()
    d["_cel"] = d[c_cel].map(_normalizar_celular)
    d["_ing"] = _parsear_fechas(d[c_ing]).dt.date
    # '_sal' existe siempre, aunque la planilla no traiga la columna: asi el
    # resto no tiene que preguntar si esta o no. Se deja en datetime64 y NO en
    # date: una columna object que mezcla date con NaN rompe el .max() del
    # groupby ("'>=' not supported between date and float"). Se convierte a date
    # recien al final, cuando ya se agrego.
    d["_sal"] = (
        _parsear_fechas(d[c_sal]) if c_sal is not None else pd.Series(pd.NaT, index=d.index, dtype="datetime64[ns]")
    )

    # --- descartes, cada uno con su aviso: nada se cae en silencio
    sin_cel = d[d["_cel"] == ""]
    if len(sin_cel):
        avisos.append(
            {
                "TIPO": "PLANILLA_SIN_CELULAR",
                "CAMPAÑA": "",
                "CLAVE": "",
                "CODIGO BEX": "",
                "DETALLE": f"{len(sin_cel)} fila(s) de la planilla sin celular",
                "IMPACTO": "esas personas no se pueden evaluar para el bono",
            }
        )
    d = d[d["_cel"] != ""]

    malos = d[d["_cel"].str.len() != LARGO_CELULAR]
    for _, r in malos.iterrows():
        avisos.append(
            {
                "TIPO": "PLANILLA_CELULAR_INVALIDO",
                "CAMPAÑA": "",
                "CLAVE": "",
                "CODIGO BEX": r["_cel"],
                "DETALLE": f"celular '{r[c_cel]}' no tiene {LARGO_CELULAR} digitos",
                "IMPACTO": "no se puede cruzar contra las afiliaciones; queda fuera",
            }
        )
    d = d[d["_cel"].str.len() == LARGO_CELULAR]

    sin_fecha = d[d["_ing"].isna()]
    if len(sin_fecha):
        avisos.append(
            {
                "TIPO": "PLANILLA_SIN_CELULAR",
                "CAMPAÑA": "",
                "CLAVE": "",
                "CODIGO BEX": ", ".join(sorted(sin_fecha["_cel"].unique())[:10]),
                "DETALLE": f"{len(sin_fecha)} contrato(s) sin fecha de ingreso",
                "IMPACTO": "sin fecha no hay ventana; quedan fuera",
            }
        )
    d = d[d["_ing"].notna()]

    # Fechas imposibles que sobrevivieron al parseo. Se avisan y se descartan:
    # dejarlas pasar significa evaluar a alguien en una ventana de 1970 y
    # negarle el bono sin que nadie se entere.
    tope = date(corte.year + 1, corte.month, corte.day)
    fuera = d[(d["_ing"] < FECHA_MIN_CREIBLE) | (d["_ing"] > tope)]
    for _, r in fuera.iterrows():
        avisos.append(
            {
                "TIPO": "PLANILLA_FECHA_IMPOSIBLE",
                "CAMPAÑA": "",
                "CLAVE": "",
                "CODIGO BEX": r["_cel"],
                "DETALLE": f"fecha de ingreso {r['_ing']} (celda: '{r[c_ing]}')",
                "IMPACTO": "fuera de rango creible; el contrato queda fuera del roster",
            }
        )
    d = d[~d.index.isin(fuera.index)]

    avisos.extend(_avisos_calidad(d, c_cel, corte))

    # --- una fila por persona
    vigentes = d[d["_ing"] <= corte]
    if vigentes.empty:
        return pd.DataFrame(columns=COLUMNAS_ROSTER), avisos

    # keep='last' sobre el orden por fecha: los datos descriptivos (cargo,
    # ciudad, campana) salen del contrato MAS RECIENTE, que es el estado actual
    # de la persona. La fecha de ingreso, en cambio, sale del primero.
    orden = vigentes.sort_values("_ing")
    ultimo = orden.drop_duplicates("_cel", keep="last").set_index("_cel")
    g = orden.groupby("_cel")

    def _texto(*candidatos):
        """Columna descriptiva del ultimo contrato, o vacia si la planilla no la trae."""
        col = _columna(d, *candidatos)
        if col is None:
            return pd.Series([""] * len(ultimo), index=ultimo.index)
        # fillna ANTES del astype: en pandas 3.x `astype(str)` propaga el
        # faltante en vez de convertirlo a 'nan', asi que un replace posterior
        # no lo ve y la celda sale NaN en el Excel.
        return ultimo[col].fillna("").astype(str).str.strip().replace("nan", "")

    roster = pd.DataFrame(
        {
            "codigo_bex": ultimo.index,
            "nombre": _texto("nombres y apellidos", "nombre").values,
            "ci": _texto("c.i.", "ci").values,
            "ciudad": _texto("ciudad").values,
            "cargo": _texto("cargo").str.upper().values,
            "campana": _texto("campaña", "campana").str.upper().values,
            "supervisor": _texto("supervisor").values,
            "estado": _texto("estado (activo/inactivo)", "estado").str.upper().values,
            "fecha_ingreso": g["_ing"].min().reindex(ultimo.index).values,
            "fecha_baja": [b.date() if pd.notna(b) else None for b in g["_sal"].max().reindex(ultimo.index)],
            "n_contratos": g.size().reindex(ultimo.index).values,
        }
    )
    return roster.reset_index(drop=True)[COLUMNAS_ROSTER], avisos


def _avisos_calidad(d: pd.DataFrame, c_cel: str, corte: date) -> list:
    """
    Errores de la planilla misma. Informativos salvo la baja imposible: no
    filtran a nadie, pero como la planilla ahora decide quien cobra, ninguno
    puede quedar sin registrar.
    """
    avisos = []
    # Se proyecta a tres columnas con nombre conocido: recorrer la planilla
    # entera por posicion se rompe en cuanto le agreguen o saquen una columna.
    # '_sal' vuelve a date aca: en esta funcion nunca se agrega, solo se compara
    # contra '_ing' detras de un pd.notna(), asi que el dtype mixto no molesta.
    contratos = d[["_cel", "_ing", "_sal"]].assign(_sal=d["_sal"].dt.date)
    for cel, g in contratos.groupby("_cel"):
        g = g.sort_values("_ing")
        # Baja anterior al ingreso: dato imposible, la ventana puede estar mal.
        for _, r in g.iterrows():
            if pd.notna(r["_sal"]) and r["_sal"] < r["_ing"]:
                avisos.append(
                    {
                        "TIPO": "PLANILLA_BAJA_ANTES_DEL_INGRESO",
                        "CAMPAÑA": "",
                        "CLAVE": "",
                        "CODIGO BEX": cel,
                        "DETALLE": f"ingreso {r['_ing']}, baja {r['_sal']}",
                        "IMPACTO": "fecha imposible; revisar antes de pagar",
                    }
                )
        # Contratos solapados: uno arranca antes de que cierre el anterior.
        filas = g.to_dict("records")
        for a, b in zip(filas, filas[1:]):
            if pd.isna(a["_sal"]) or a["_sal"] >= b["_ing"]:
                cierre = a["_sal"] if pd.notna(a["_sal"]) else "abierto"
                avisos.append(
                    {
                        "TIPO": "PLANILLA_CONTRATOS_SOLAPADOS",
                        "CAMPAÑA": "",
                        "CLAVE": "",
                        "CODIGO BEX": cel,
                        "DETALLE": f"contrato {a['_ing']}-{cierre} se solapa con {b['_ing']}",
                        "IMPACTO": "informativo; se toma el primer ingreso",
                    }
                )

    c_ci = _columna(d, "c.i.", "ci")
    if c_ci is not None:
        ci = d[[c_ci, "_cel"]].copy()
        ci["_ci"] = ci[c_ci].astype(str).str.strip()
        ci = ci[~ci["_ci"].isin(("", "0", "nan"))]
        por_ci = ci.groupby("_ci")["_cel"].nunique()
        for k in por_ci.index[por_ci > 1]:
            cels = sorted(ci[ci["_ci"] == k]["_cel"].unique())
            avisos.append(
                {
                    "TIPO": "PLANILLA_CI_EN_2_CELULARES",
                    "CAMPAÑA": "",
                    "CLAVE": k,
                    "CODIGO BEX": ", ".join(cels),
                    "DETALLE": "el mismo CI figura con mas de un celular",
                    "IMPACTO": "informativo; se evaluan como personas distintas",
                }
            )

    c_est = _columna(d, "estado (activo/inactivo)", "estado")
    if c_est is not None:
        inact = d[d[c_est].astype(str).str.strip().str.upper().eq("INACTIVO") & d["_sal"].isna()]
        for cel in sorted(inact["_cel"].unique()):
            avisos.append(
                {
                    "TIPO": "PLANILLA_INACTIVO_SIN_SALIDA",
                    "CAMPAÑA": "",
                    "CLAVE": "",
                    "CODIGO BEX": cel,
                    "DETALLE": "INACTIVO sin fecha de salida",
                    "IMPACTO": "informativo; no se puede saber si la baja cae en la ventana",
                }
            )
    return avisos


# =============================================================================
# Demografia por persona (P10 - beneficio de seguro COBOSER)
# =============================================================================

COLUMNAS_DEMOGRAFIA = [
    "codigo_bex",
    "ci",
    "nombres",
    "apellidos",
    "fecha_nacimiento",
    "ciudad",
    "celular",
    "genero",
    "cargo",
    "campana",
    "estado",
    "fecha_ingreso",
]

# La planilla escribe el genero faltante de tres formas distintas.
GENEROS_VACIOS = {"", "-", "NAN", "NONE", "S/D"}


def _normalizar_ci(valor) -> str:
    """Solo digitos: la aseguradora pide 'NRO CI /SOLO NUMERO)'."""
    txt = str(valor).strip()
    if txt.endswith(".0"):
        txt = txt[:-2]
    return "".join(c for c in txt if c.isdigit())


def cargar_demografia(corte: date, max_intentos: int = 3) -> tuple:
    """
    Una fila por persona con los datos que pide la aseguradora.

    Devuelve (DataFrame[COLUMNAS_DEMOGRAFIA], avisos).

    Existe aparte de `cargar_roster_contratos` y no como columnas nuevas de
    COLUMNAS_ROSTER porque ese contrato de forma lo comparten tres fuentes
    (planilla, dim_ejecutivo y rrhh_bd, ver CLAUDE.md) y ninguna de las otras
    dos tiene fecha de nacimiento ni genero. Agregarlas ahi obligaria a meter
    placeholders vacios en dos fuentes para beneficiar a un solo proceso.

    Mantiene los mismos criterios que el roster: `fecha_ingreso` del PRIMER
    contrato, datos descriptivos del MAS RECIENTE.
    """
    df, avisos = descargar_planilla(max_intentos=max_intentos)

    c_cel = _columna(df, "celular")
    c_ing = _columna(df, "fecha de ingreso")
    if c_cel is None or c_ing is None:
        raise ValueError(f"La planilla no tiene 'celular' y/o 'fecha de ingreso'. Columnas: {list(df.columns)}")

    d = df.copy()
    d["_cel"] = d[c_cel].map(_normalizar_celular)
    d["_ing"] = _parsear_fechas(d[c_ing]).dt.date
    d = d[(d["_cel"].str.len() == LARGO_CELULAR) & d["_ing"].notna()]
    d = d[d["_ing"] <= corte]
    if d.empty:
        return pd.DataFrame(columns=COLUMNAS_DEMOGRAFIA), avisos

    # El contrato que representa a la persona es el VIGENTE, no el de ingreso
    # mas reciente. No es lo mismo: quien ascendio a supervisor conserva el
    # contrato viejo de activador con fecha POSTERIOR (Maria Fernanda Daza:
    # supervisor ACTIVO desde 2025-02-01, activador INACTIVO desde 2025-08-01),
    # y un reingreso puede tener dos filas con la misma fecha, una activa y una
    # no (Ruth Ponce, 5 contratos). Ordenando solo por fecha ganaba el inactivo
    # y la persona quedaba marcada INACTIVO: perdia el seguro sin que nada lo
    # avisara. Se ordena primero por estado, asi `keep="last"` toma el activo
    # mas reciente y, si no hay ninguno activo, el inactivo mas reciente.
    c_est = _columna(d, "estado (activo/inactivo)", "estado")
    d["_activo"] = d[c_est].fillna("").astype(str).str.strip().str.upper().eq("ACTIVO") if c_est is not None else False
    orden = d.sort_values(["_activo", "_ing"])
    ultimo = orden.drop_duplicates("_cel", keep="last").set_index("_cel")
    primer_ingreso = orden.groupby("_cel")["_ing"].min().reindex(ultimo.index)

    def _texto(*candidatos):
        col = _columna(d, *candidatos)
        if col is None:
            return pd.Series([""] * len(ultimo), index=ultimo.index)
        return ultimo[col].fillna("").astype(str).str.strip().replace("nan", "")

    apellidos = (_texto("apellido paterno") + " " + _texto("apellido materno")).str.replace(r"\s+", " ", regex=True)

    c_nac = _columna(d, "fecha de nacimiento")
    if c_nac is None:
        nacimiento = pd.Series(pd.NaT, index=ultimo.index, dtype="datetime64[ns]")
        avisos.append(
            {
                "TIPO": "PLANILLA_SIN_COLUMNA_NACIMIENTO",
                "CAMPAÑA": "",
                "CLAVE": "",
                "CODIGO BEX": "",
                "DETALLE": "la planilla no trae 'FECHA DE NACIMIENTO'",
                "IMPACTO": "la columna sale vacia en el reporte de la aseguradora",
            }
        )
    else:
        nacimiento = _parsear_fechas(ultimo[c_nac], serial_min=SERIAL_NACIMIENTO_MIN, serial_max=SERIAL_NACIMIENTO_MAX)

    # Fuera del rango creible el dato es basura (celda con hora, serial mal
    # tipeado, un 2019 que en realidad es el hijo de alguien). Se descarta y se
    # avisa: mandarle a COBOSER una fecha de nacimiento inventada es peor que
    # mandarla vacia, porque la aseguradora la usa para calcular la prima.
    tope_nacimiento = date(corte.year - EDAD_MINIMA, corte.month, corte.day)
    nac = nacimiento.dt.date
    creible = nac.notna() & (nac >= NACIMIENTO_MIN_CREIBLE) & (nac <= tope_nacimiento)
    for cel in nac.index[nac.notna() & ~creible]:
        avisos.append(
            {
                "TIPO": "PLANILLA_NACIMIENTO_INVALIDO",
                "CAMPAÑA": "",
                "CLAVE": "",
                "CODIGO BEX": cel,
                "DETALLE": f"fecha de nacimiento {nac[cel]} fuera de [{NACIMIENTO_MIN_CREIBLE}, {tope_nacimiento}]",
                "IMPACTO": "se manda vacia a la aseguradora",
            }
        )

    genero = _texto("genero").str.upper()
    genero = genero.where(~genero.isin(GENEROS_VACIOS), "")

    demo = pd.DataFrame(
        {
            "codigo_bex": ultimo.index,
            "ci": ultimo[_columna(d, "c.i.", "ci")].map(_normalizar_ci).values if _columna(d, "c.i.", "ci") else "",
            "nombres": _texto("nombres").values,
            "apellidos": apellidos.values,
            "fecha_nacimiento": nac.where(creible).values,
            "ciudad": _texto("ciudad").str.upper().values,
            "celular": ultimo.index,
            "genero": genero.values,
            "cargo": _texto("cargo").str.upper().values,
            "campana": _texto("campaña", "campana").str.upper().values,
            "estado": _texto("estado (activo/inactivo)", "estado").str.upper().values,
            "fecha_ingreso": primer_ingreso.values,
        }
    )
    return demo.reset_index(drop=True)[COLUMNAS_DEMOGRAFIA], avisos
