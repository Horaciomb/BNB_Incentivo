import json
import os
import time
from datetime import date, datetime, timedelta
from typing import Dict, List, Any
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor

# Carga .env si existe (patron de las demas apps BNB en el servidor: Caddy
# bloquea servir .env como estatico globalmente). Sin archivo, no hace nada
# y os.getenv sigue leyendo del entorno del proceso, como antes.
load_dotenv()

app = FastAPI(
    title="API Incentivos BEX - BNB / Bille",
    description="Servicio Backend en FastAPI para el Panel de Incentivos multi-campaña (rrhh_bd + bnb_bd + bille_bd)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de Base de Datos PostgreSQL — rrhh_bd (datos de empleados)
DB_HOST = os.getenv("DB_HOST", "10.0.0.2")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "rrhh_bd")
DB_USER = os.getenv("DB_USER", "bex_app")
DB_PASS = os.getenv("DB_PASSWORD", "")

# Conexión de solo lectura a bnb_bd / bille_bd — producción real de cada campaña.
# Requiere el rol bex_ingeniero (bex_app no tiene acceso a estas bases). Mismo patrón
# de credenciales que rrhh-app y el proyecto de migración RRHH_BD: variable de entorno
# RRHH_PG_PASSWORD, nunca hardcodeada ni versionada.
RRHH_PG_HOST = os.getenv("RRHH_PG_HOST", DB_HOST)
RRHH_PG_PORT = int(os.getenv("RRHH_PG_PORT", str(DB_PORT)))
RRHH_PG_USER = os.getenv("RRHH_PG_USER", "bex_ingeniero")
RRHH_PG_PASSWORD = os.getenv("RRHH_PG_PASSWORD", "")

# ---------------------------------------------------------------------------
# Configuración de campañas
# ---------------------------------------------------------------------------
# Las reglas de cada campaña (ventana, metas, premios, bono de supervisor) viven
# en campanas.json, junto a este archivo. Es la ÚNICA fuente de verdad: el
# frontend las recibe por la API y no duplica ninguna meta ni premio.
CAMPANAS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "campanas.json")

# Meses que una campaña terminada sigue siendo consultable desde el selector.
MESES_HISTORICO = 3

# Bases permitidas en el campo "bd" de cada proyecto. Evita que un JSON mal
# escrito abra una conexión a una base arbitraria.
BDS_VALIDAS = {"bnb_bd", "bille_bd"}

_campanas_cache: Dict[str, Any] = {"mtime": None, "campanas": []}


def _validar_campana(c: Dict[str, Any], ids_vistos: set) -> None:
    cid = c.get("id")
    if not cid:
        raise ValueError("Hay una campaña sin 'id'.")
    if cid in ids_vistos:
        raise ValueError(f"Id de campaña duplicado: {cid}")
    ids_vistos.add(cid)

    proyectos = c.get("proyectos") or []
    if not proyectos:
        raise ValueError(f"La campaña {cid} no tiene proyectos.")

    keys = set()
    for p in proyectos:
        for campo in ("key", "etiqueta", "bd", "tema", "meta", "premio_bs"):
            if p.get(campo) is None:
                raise ValueError(f"Proyecto de {cid} sin campo '{campo}'.")
        if p["bd"] not in BDS_VALIDAS:
            raise ValueError(f"Base no permitida en {cid}: {p['bd']} (válidas: {sorted(BDS_VALIDAS)})")
        if p["key"] in keys:
            raise ValueError(f"Proyecto repetido en {cid}: {p['key']}")
        keys.add(p["key"])

    try:
        desde = date.fromisoformat(c["desde"])
        hasta = date.fromisoformat(c["hasta"])
    except (KeyError, ValueError) as exc:
        raise ValueError(f"Fechas inválidas en {cid}: {exc}") from exc
    if desde > hasta:
        raise ValueError(f"En {cid}, 'desde' ({desde}) es posterior a 'hasta' ({hasta}).")


def _estado_campana(desde: date, hasta: date, hoy: date) -> str:
    if hoy < desde:
        return "futura"
    if hoy > hasta:
        return "pasada"
    return "activa"


def _cargar_campanas() -> List[Dict[str, Any]]:
    """Lee campanas.json, cacheado por mtime — editar el archivo en el servidor
    surte efecto sin reiniciar el servicio. Deriva hasta_exclusivo (lo que va al
    SQL) y el estado respecto de hoy. Un JSON inválido lanza, no degrada callado."""
    mtime = os.path.getmtime(CAMPANAS_PATH)
    if _campanas_cache["mtime"] != mtime:
        with open(CAMPANAS_PATH, encoding="utf-8") as fh:
            crudo = json.load(fh)
        campanas = crudo.get("campanas")
        if not isinstance(campanas, list) or not campanas:
            raise ValueError("campanas.json no contiene una lista 'campanas' no vacía.")
        ids_vistos: set = set()
        for c in campanas:
            _validar_campana(c, ids_vistos)
        _campanas_cache["campanas"] = campanas
        _campanas_cache["mtime"] = mtime

    hoy = date.today()
    resultado = []
    for c in _campanas_cache["campanas"]:
        c = dict(c)
        desde = date.fromisoformat(c["desde"])
        hasta = date.fromisoformat(c["hasta"])
        # El SQL filtra fecha_hora_envio < hasta_exclusivo, así que el último día
        # de campaña entra completo.
        c["hasta_exclusivo"] = (hasta + timedelta(days=1)).isoformat()
        c["estado"] = _estado_campana(desde, hasta, hoy)
        resultado.append(c)
    # Más recientes primero.
    resultado.sort(key=lambda x: x["desde"], reverse=True)
    return resultado


def _campanas_visibles() -> List[Dict[str, Any]]:
    """Activas, futuras, y terminadas hace menos de MESES_HISTORICO meses."""
    limite = date.today() - timedelta(days=MESES_HISTORICO * 30)
    return [c for c in _cargar_campanas()
            if c["estado"] != "pasada" or date.fromisoformat(c["hasta"]) >= limite]


def _buscar_campana(campana_id: str) -> Dict[str, Any]:
    for c in _campanas_visibles():
        if c["id"] == campana_id:
            return c
    raise HTTPException(
        status_code=404,
        detail=f"Campaña no encontrada o fuera del histórico de {MESES_HISTORICO} meses: {campana_id}"
    )


# ---------------------------------------------------------------------------
# Datos de respaldo
# ---------------------------------------------------------------------------
# Roster demo único: se usa cuando faltan credenciales o falla la BD, para
# cualquier campaña. La respuesta lo marca con es_respaldo=true para que la UI
# avise en vez de mostrar números inventados como si fueran reales.
FALLBACK_ROSTER = [
    {"nombre": "DANIELA ANDREA VARGAS ARÉVALO", "ci": "88888801", "ciudad": "La Paz", "supervisor": "MILENKA ADRIANA ORDOÑEZ NUÑEZ", "cuentas_bnb": 62, "cuentas_bille": 12},
    {"nombre": "DIEGO ARMANDO COLQUE COLQUE", "ci": "88888802", "ciudad": "Cochabamba", "supervisor": "PAMELA FANNY CALANI LAURA", "cuentas_bnb": 45, "cuentas_bille": 8},
    {"nombre": "GABRIELA QUIÑONES YPORRE", "ci": "88888803", "ciudad": "Santa Cruz", "supervisor": "DELIA JORDAN FACUSSE", "cuentas_bnb": 65, "cuentas_bille": 72},
    {"nombre": "JHENIFER LUCERO SERRUDO LLAMPA", "ci": "88888804", "ciudad": "Sucre", "supervisor": "JENNY CRISTINA ECHALAR MONTALVO", "cuentas_bnb": 68, "cuentas_bille": 70},
    {"nombre": "JHOJAN JAIRO CALLAHUARA CHOQUE", "ci": "88888805", "ciudad": "Cochabamba", "supervisor": "PAMELA FANNY CALANI LAURA", "cuentas_bnb": 38, "cuentas_bille": 5},
    {"nombre": "LUIS ANGEL SIHUAIROS CANO", "ci": "88888806", "ciudad": "Sucre", "supervisor": "JENNY CRISTINA ECHALAR MONTALVO", "cuentas_bnb": 58, "cuentas_bille": 61},
    {"nombre": "MARCO ANTONIO ESCOBAR ALVAREZ", "ci": "88888807", "ciudad": "Santa Cruz", "supervisor": "BEATRIZ OVIEDO OVIEDO", "cuentas_bnb": 22, "cuentas_bille": 4},
    {"nombre": "PABLO SANTIAGO PEREZ NAVA", "ci": "88888808", "ciudad": "Cochabamba", "activo": False, "fecha_baja": "2026-09-02", "supervisor": "PAMELA FANNY CALANI LAURA", "cuentas_bnb": 71, "cuentas_bille": 14},
    {"nombre": "RENE NUÑEZ SOLIS", "ci": "88888809", "ciudad": "Sucre", "supervisor": "JENNY CRISTINA ECHALAR MONTALVO", "cuentas_bnb": 52, "cuentas_bille": 71},
    {"nombre": "REYNA IVONNE CALLE NINA", "ci": "88888810", "ciudad": "La Paz", "supervisor": "CLAUDIA SHASKIA CALLE NINA", "cuentas_bnb": 60, "cuentas_bille": 35},
    {"nombre": "BRUNO ROCHA PEREIRA", "ci": "88888811", "ciudad": "Cochabamba", "supervisor": "HASIRA DANIELA OSINAGA CHOQUE", "cuentas_bnb": 10, "cuentas_bille": 58},
    {"nombre": "CAMILA ANDREA LOZA MERINO", "ci": "88888812", "ciudad": "La Paz", "supervisor": "GERCY EVER ERGUETA KIPPES", "cuentas_bnb": 15, "cuentas_bille": 42},
    {"nombre": "DANIELA ASCARRAGA DOMINGUEZ", "ci": "88888813", "ciudad": "Santa Cruz", "activo": False, "fecha_baja": "2026-08-28", "supervisor": "JOSE GUTIERREZ PEDRAZA", "cuentas_bnb": 20, "cuentas_bille": 72},
    {"nombre": "JOHANNA CASSANDRA CHAVEZ VALERIANO", "ci": "88888814", "ciudad": "Cochabamba", "supervisor": "HASIRA DANIELA OSINAGA CHOQUE", "cuentas_bnb": 8, "cuentas_bille": 30},
    {"nombre": "JOSÉ OLAF ROJAS CONDARCO", "ci": "88888815", "ciudad": "Cochabamba", "supervisor": "HASIRA DANIELA OSINAGA CHOQUE", "cuentas_bnb": 14, "cuentas_bille": 56},
    {"nombre": "RUBEN ANTONIO HINOJOSA TUPA", "ci": "88888816", "ciudad": "La Paz", "supervisor": "CLAUDIA SHASKIA CALLE NINA", "cuentas_bnb": 5, "cuentas_bille": 28},
    {"nombre": "SARAI VANESA TERAN GONZALES", "ci": "88888817", "ciudad": "Cochabamba", "supervisor": "HASIRA DANIELA OSINAGA CHOQUE", "cuentas_bnb": 19, "cuentas_bille": 59}
]

# Clave de FALLBACK_ROSTER por base de datos, para poder armar el respaldo de
# cualquier campaña a partir de sus proyectos.
_FALLBACK_KEY_POR_BD = {"bnb_bd": "cuentas_bnb", "bille_bd": "cuentas_bille"}

# CI ficticio de cada supervisor del roster demo, para que el reporte de
# contabilidad tenga la misma forma que con datos reales.
_FALLBACK_CI_SUPERVISOR = {
    sup: "888889%02d" % (i + 1)
    for i, sup in enumerate(sorted({r["supervisor"] for r in FALLBACK_ROSTER}))
}


# ---------------------------------------------------------------------------
# Cálculo de premios
# ---------------------------------------------------------------------------
def _evaluar_afiliador(cuentas: Dict[str, int], campana: Dict[str, Any]) -> Dict[str, Any]:
    """Metas cumplidas y premio en Bs para un afiliador, según las reglas de la
    campaña. Generaliza a N proyectos: doble = cumplió todas las metas."""
    proyectos = campana["proyectos"]
    cumplidas = [p["key"] for p in proyectos if cuentas.get(p["key"], 0) >= p["meta"]]
    es_doble = len(proyectos) > 1 and len(cumplidas) == len(proyectos)

    doble = campana.get("doble") or {}
    if es_doble and doble.get("premio_bs"):
        premio = doble["premio_bs"]
    else:
        premio = sum(p["premio_bs"] for p in proyectos if p["key"] in cumplidas)

    return {"metas_cumplidas": cumplidas, "es_doble": es_doble, "premio_bs": premio}


def _armar_afiliadores(raw_list: List[Dict[str, Any]], campana: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Una fila por persona, con un dict de cuentas por proyecto de la campaña.
    El orden lo decide el frontend, que ordena según la pestaña activa."""
    proyectos = campana["proyectos"]
    res = []
    for item in raw_list:
        crudas = item.get("cuentas", {})
        cuentas = {p["key"]: int(crudas.get(p["key"], 0)) for p in proyectos}
        res.append({
            "nombre": item.get("nombre", ""),
            # CI para el reporte de contabilidad (decision explicita del usuario:
            # viaja en la respuesta publica, ver CLAUDE.md).
            "ci": item.get("ci", ""),
            "supervisor": item.get("supervisor", ""),
            "supervisor_ci": item.get("supervisor_ci", ""),
            "supervisor_activo": item.get("supervisor_activo"),
            "ciudad": item.get("ciudad", ""),
            # Estado en personal. Un inactivo que aparece aca produjo dentro de
            # la campana: gano el bono aunque ya no este en la empresa.
            "activo": item.get("activo", True),
            "fecha_baja": item.get("fecha_baja"),
            "cuentas": cuentas,
            **_evaluar_afiliador(cuentas, campana)
        })
    return res


def _armar_supervisores(afiliadores: List[Dict[str, Any]], campana: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Bono de supervisor: Bs X por cada afiliador de su equipo que cobre algún
    bono. Cuenta PERSONAS, no bonos — quien cobra el doble meta aporta una vez.
    Devuelve [] si la campaña no define incentivo de supervisor."""
    regla = campana.get("supervisor")
    if not regla:
        return []

    bs = regla["bs_por_afiliador"]
    equipos: Dict[str, Dict[str, Any]] = {}
    for a in afiliadores:
        sup = (a.get("supervisor") or "").strip()
        # 'BEX' es el valor por defecto de la consulta cuando el empleado no
        # tiene supervisor asignado: no es una persona, no cobra bono.
        if not sup or sup == "BEX":
            continue
        eq = equipos.setdefault(sup, {
            "supervisor": sup, "ci": "", "activo": None, "ciudades": set(),
            "afiliadores_total": 0, "afiliadores_con_bono": 0
        })
        # El CI y el estado del supervisor llegan repetidos en cada miembro del
        # equipo; basta el primero no vacio para poder pagarle su propio bono.
        if not eq["ci"] and a.get("supervisor_ci"):
            eq["ci"] = a["supervisor_ci"]
        if eq["activo"] is None and a.get("supervisor_activo") is not None:
            eq["activo"] = bool(a["supervisor_activo"])
        eq["afiliadores_total"] += 1
        if a["premio_bs"] > 0:
            eq["afiliadores_con_bono"] += 1
        if a.get("ciudad"):
            eq["ciudades"].add(a["ciudad"])

    res = []
    for eq in equipos.values():
        ciudades = sorted(eq.pop("ciudades"))
        eq["ciudad"] = ciudades[0] if len(ciudades) == 1 else ("Varias" if ciudades else "")
        eq["premio_bs"] = eq["afiliadores_con_bono"] * bs
        res.append(eq)
    res.sort(key=lambda x: (-x["premio_bs"], x["supervisor"]))
    return res


# ---------------------------------------------------------------------------
# Acceso a datos
# ---------------------------------------------------------------------------
def _obtener_empleados_activos_bnb() -> List[Dict[str, Any]]:
    """Empleados activos de la unidad BNB (que incluye la campaña BILLE) desde rrhh_bd,
    con su teléfono — la llave de cruce contra bnb_bd/bille_bd.fact_afiliaciones.
    El roster es el mismo para todas las campañas."""
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASS, connect_timeout=3
    )
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    TRIM(CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno)) AS nombre,
                    COALESCE(TRIM(p.ci), '') AS ci,
                    COALESCE(c.nombre_ciudad, 'La Paz') AS ciudad,
                    COALESCE(
                        NULLIF(TRIM(CONCAT_WS(' ', sup.nombres, sup.apellido_paterno, sup.apellido_materno)), ''),
                        'BEX'
                    ) AS supervisor,
                    COALESCE(TRIM(sup.ci), '') AS supervisor_ci,
                    eu.activo,
                    eu.fecha_baja,
                    -- Estado del supervisor sin multiplicar filas: una persona
                    -- puede tener varios periodos en la unidad, basta con que
                    -- alguno siga abierto. Subconsulta, nunca un JOIN.
                    (SELECT bool_or(x.activo)
                       FROM empleado_unidad x
                      WHERE x.id_persona = eu.id_persona_supervisor) AS supervisor_activo,
                    TRIM(eu.telefono) AS telefono
                FROM empleado_unidad eu
                JOIN persona p ON p.id_persona = eu.id_persona
                JOIN unidad_negocio un ON un.id_unidad_negocio = eu.id_unidad_negocio
                LEFT JOIN ciudad c ON c.id_ciudad = eu.id_ciudad
                LEFT JOIN persona sup ON sup.id_persona = eu.id_persona_supervisor
                WHERE un.codigo = 'BNB'
                  AND eu.telefono IS NOT NULL AND TRIM(eu.telefono) <> ''
                -- Los inactivos entran aca y se filtran despues por produccion.
                -- El orden importa: ante un celular repetido gana la fila activa,
                -- y entre bajas la mas reciente.
                ORDER BY eu.activo DESC, eu.fecha_baja DESC NULLS LAST
            """)
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def _contar_afiliaciones_por_celular(dbname: str, desde: str, hasta_exclusivo: str) -> Dict[str, int]:
    """Cuentas no duplicadas por celular dentro de la ventana de la campaña, leídas
    directo de fact_afiliaciones en bnb_bd o bille_bd (bex_ingeniero, solo lectura).
    codigo_bex en estas bases guarda el CELULAR, no un código de negocio.
    Se filtra por fecha_hora_envio, NUNCA por el agregado mensual
    rrhh_bd.actividad_afiliacion_mensual — ese cubre el mes completo y
    sobrecontaría producción de fuera de la ventana."""
    conn = psycopg2.connect(
        host=RRHH_PG_HOST, port=RRHH_PG_PORT, dbname=dbname,
        user=RRHH_PG_USER, password=RRHH_PG_PASSWORD, connect_timeout=5
    )
    try:
        conn.set_session(readonly=True)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT TRIM(codigo_bex) AS celular, COUNT(DISTINCT id_afiliacion) AS cuentas
                FROM fact_afiliaciones
                WHERE codigo_bex IS NOT NULL AND TRIM(codigo_bex) <> ''
                  AND fecha_hora_envio >= %(desde)s AND fecha_hora_envio < %(hasta)s
                GROUP BY 1
            """, {"desde": desde, "hasta": hasta_exclusivo})
            return {celular: cuentas for celular, cuentas in cur.fetchall()}
    finally:
        conn.close()


def _roster_desde_bd(campana: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Roster real cruzado con la producción de cada proyecto de la campaña.
    Una consulta por base distinta (bnb_bd y bille_bd comparten esquema)."""
    empleados = _obtener_empleados_activos_bnb()

    mapas: Dict[str, Dict[str, int]] = {}
    for p in campana["proyectos"]:
        if p["bd"] not in mapas:
            mapas[p["bd"]] = _contar_afiliaciones_por_celular(
                p["bd"], campana["desde"], campana["hasta_exclusivo"]
            )

    raw_data = []
    vistos = set()
    for e in empleados:
        tel = e["telefono"]
        if tel in vistos:
            # Mismo celular en más de un empleado_unidad activo — caso
            # ambiguo documentado en el proyecto de migración (10-15 casos
            # históricos). Se omite el duplicado en vez de contar la
            # producción dos veces.
            print(f"Celular duplicado entre activos BNB, se omite: {tel}")
            continue
        vistos.add(tel)
        cuentas = {p["key"]: mapas[p["bd"]].get(tel, 0) for p in campana["proyectos"]}

        # Los dados de baja solo entran si produjeron dentro de la ventana:
        # ganaron su bono y contabilidad tiene que pagarlo, pero el historico
        # completo de ex empleados en cero no aporta nada al tablero.
        if not e["activo"] and not any(cuentas.values()):
            continue

        raw_data.append({
            "nombre": e["nombre"],
            "ci": e["ci"],
            "ciudad": e["ciudad"],
            "activo": bool(e["activo"]),
            "fecha_baja": e["fecha_baja"].isoformat() if e["fecha_baja"] else None,
            "supervisor": e["supervisor"],
            "supervisor_ci": e["supervisor_ci"],
            "supervisor_activo": e["supervisor_activo"],
            "cuentas": cuentas,
        })
    return raw_data


def _roster_de_respaldo(campana: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [{
        "nombre": r["nombre"],
        "ci": r["ci"],
        "ciudad": r["ciudad"],
        "activo": r.get("activo", True),
        "fecha_baja": r.get("fecha_baja"),
        "supervisor": r["supervisor"],
        "supervisor_ci": _FALLBACK_CI_SUPERVISOR.get(r["supervisor"], ""),
        "supervisor_activo": True,
        "cuentas": {p["key"]: r[_FALLBACK_KEY_POR_BD[p["bd"]]] for p in campana["proyectos"]},
    } for r in FALLBACK_ROSTER]


# ---------------------------------------------------------------------------
# Caché de resultados
# ---------------------------------------------------------------------------
# El selector de campañas dispara un refetch por cambio, y cada cálculo abre 3
# conexiones a PostgreSQL. Las campañas terminadas ya no cambian, así que se
# cachean mucho más tiempo que las vigentes.
TTL_ACTIVA = 300      # 5 min
TTL_PASADA = 3600     # 1 h
_datos_cache: Dict[str, Any] = {}


def _calcular_incentivos(campana: Dict[str, Any]) -> Dict[str, Any]:
    raw_data: List[Dict[str, Any]] = []
    es_respaldo = True

    if DB_PASS and RRHH_PG_PASSWORD:
        try:
            raw_data = _roster_desde_bd(campana)
            es_respaldo = not raw_data
        except Exception as e:
            print(f"Error conectando a BD PostgreSQL: {e}")
            raw_data = []

    if not raw_data:
        # Sin credenciales o con la BD caída se sirve el roster demo completo,
        # nunca datos reales a medias (p.ej. nombres reales con cuentas en 0).
        raw_data = _roster_de_respaldo(campana)

    afiliadores = _armar_afiliadores(raw_data, campana)
    return {
        "campana": campana,
        "fecha_actualizacion": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "es_respaldo": es_respaldo,
        "afiliadores": afiliadores,
        "supervisores": _armar_supervisores(afiliadores, campana),
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    try:
        cargadas = len(_cargar_campanas())
        error_config = None
    except Exception as e:
        cargadas = 0
        error_config = str(e)
    return {
        "status": "ok",
        "database": "configurada" if (DB_PASS and RRHH_PG_PASSWORD) else "sin credenciales",
        "campanas_cargadas": cargadas,
        "error_config": error_config,
    }


@app.get("/api/campanas")
def listar_campanas():
    """Campañas elegibles en el selector: vigentes, próximas, y terminadas hace
    menos de MESES_HISTORICO meses. Sin datos pesados."""
    return {
        "meses_historico": MESES_HISTORICO,
        "campanas": [{
            "id": c["id"],
            "nombre": c["nombre"],
            "subtitulo": c.get("subtitulo", ""),
            "periodo_texto": c.get("periodo_texto", ""),
            "desde": c["desde"],
            "hasta": c["hasta"],
            "estado": c["estado"],
            "tiene_supervisor": bool(c.get("supervisor")),
        } for c in _campanas_visibles()]
    }


@app.get("/api/incentivos/{campana_id}")
def get_incentivos(campana_id: str):
    # Compatibilidad con la ruta de una sola campaña que servía la versión 1.x.
    if campana_id == "cierre-agosto":
        campana_id = "cierre-agosto-2026"

    campana = _buscar_campana(campana_id)

    ttl = TTL_PASADA if campana["estado"] == "pasada" else TTL_ACTIVA
    ahora = time.time()
    guardado = _datos_cache.get(campana_id)
    if guardado and ahora - guardado[0] < ttl:
        return guardado[1]

    payload = _calcular_incentivos(campana)
    _datos_cache[campana_id] = (ahora, payload)
    return payload


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
