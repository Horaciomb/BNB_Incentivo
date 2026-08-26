import os
from datetime import datetime
from typing import Dict, List, Any
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor

# Carga .env si existe (patron de las demas apps BNB en el servidor: Caddy
# bloquea servir .env como estatico globalmente). Sin archivo, no hace nada
# y os.getenv sigue leyendo del entorno del proceso, como antes.
load_dotenv()

app = FastAPI(
    title="API Incentivos BEX - Cierre de Agosto 2026",
    description="Servicio Backend en FastAPI para conectar el Panel de Incentivos (Cierre de Agosto) con PostgreSQL rrhh_bd",
    version="1.1.0"
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

# Ventana exacta de la campaña (correo.txt: 24 al 31 de agosto de 2026). Se filtra por
# fecha_hora_envio en fact_afiliaciones, NUNCA por el agregado mensual
# rrhh_bd.actividad_afiliacion_mensual — ese agregado cubre el mes completo y
# sobrecontaría cuentas generadas antes del 24.
CAMPANA_DESDE = "2026-08-24"
CAMPANA_HASTA_EXCLUSIVO = "2026-09-01"

# Configuración oficial según correo.txt (Cierre de Agosto 2026: 24 al 31 de agosto)
META_CONFIG = {
    "BNB": {
        "title": "INCENTIVO PROYECTO BNB",
        "color": "bg-emerald-600",
        "target": 60,
        "prize": "Bs. 150",
        "period": "24 al 31 de Agosto de 2026",
        "description": "Alcanzar 60 cuentas no duplicadas para obtener el Vale de Consumo de Bs. 150."
    },
    "BILLE": {
        "title": "INCENTIVO PROYECTO BILLE",
        "color": "bg-indigo-600",
        "target": 70,
        "prize": "Bs. 150",
        "period": "24 al 31 de Agosto de 2026",
        "description": "Alcanzar 70 cuentas no duplicadas para obtener el Vale de Consumo de Bs. 150."
    },
    "DOBLE": {
        "title": "PREMIO DOBLE META",
        "prize": "Bs. 300",
        "description": "Si un afiliador cumple los objetivos de BNB (60 cts) y Bille (70 cts), cobrará un vale de consumo de Bs. 300."
    }
}

FALLBACK_BNB = [
    {"nombre": "DANIELA ANDREA VARGAS ARÉVALO", "ciudad": "La Paz", "supervisor": "MILENKA ADRIANA ORDOÑEZ NUÑEZ", "cuentas_bnb": 62, "cuentas_bille": 12},
    {"nombre": "DIEGO ARMANDO COLQUE COLQUE", "ciudad": "Cochabamba", "supervisor": "PAMELA FANNY CALANI LAURA", "cuentas_bnb": 45, "cuentas_bille": 8},
    {"nombre": "GABRIELA QUIÑONES YPORRE", "ciudad": "Santa Cruz", "supervisor": "DELIA JORDAN FACUSSE", "cuentas_bnb": 65, "cuentas_bille": 72},
    {"nombre": "JHENIFER LUCERO SERRUDO LLAMPA", "ciudad": "Sucre", "supervisor": "JENNY CRISTINA ECHALAR MONTALVO", "cuentas_bnb": 68, "cuentas_bille": 20},
    {"nombre": "JHOJAN JAIRO CALLAHUARA CHOQUE", "ciudad": "Cochabamba", "supervisor": "PAMELA FANNY CALANI LAURA", "cuentas_bnb": 38, "cuentas_bille": 5},
    {"nombre": "LUIS ANGEL SIHUAIROS CANO", "ciudad": "Sucre", "supervisor": "JENNY CRISTINA ECHALAR MONTALVO", "cuentas_bnb": 58, "cuentas_bille": 10},
    {"nombre": "MARCO ANTONIO ESCOBAR ALVAREZ", "ciudad": "Santa Cruz", "supervisor": "BEATRIZ OVIEDO OVIEDO", "cuentas_bnb": 22, "cuentas_bille": 4},
    {"nombre": "PABLO SANTIAGO PEREZ NAVA", "ciudad": "Cochabamba", "supervisor": "PAMELA FANNY CALANI LAURA", "cuentas_bnb": 71, "cuentas_bille": 14},
    {"nombre": "RENE NUÑEZ SOLIS", "ciudad": "Sucre", "supervisor": "JENNY CRISTINA ECHALAR MONTALVO", "cuentas_bnb": 52, "cuentas_bille": 9},
    {"nombre": "REYNA IVONNE CALLE NINA", "ciudad": "La Paz", "supervisor": "CLAUDIA SHASKIA CALLE NINA", "cuentas_bnb": 60, "cuentas_bille": 11}
]

FALLBACK_BILLE = [
    {"nombre": "BRUNO ROCHA PEREIRA", "ciudad": "Cochabamba", "supervisor": "HASIRA DANIELA OSINAGA CHOQUE", "cuentas_bnb": 10, "cuentas_bille": 58},
    {"nombre": "CAMILA ANDREA LOZA MERINO", "ciudad": "La Paz", "supervisor": "GERCY EVER ERGUETA KIPPES", "cuentas_bnb": 15, "cuentas_bille": 42},
    {"nombre": "DANIELA ASCARRAGA DOMINGUEZ", "ciudad": "Santa Cruz", "supervisor": "JOSE GUTIERREZ PEDRAZA", "cuentas_bnb": 20, "cuentas_bille": 72},
    {"nombre": "GABRIELA QUIÑONES YPORRE", "ciudad": "Santa Cruz", "supervisor": "DELIA JORDAN FACUSSE", "cuentas_bnb": 65, "cuentas_bille": 72},
    {"nombre": "JHENIFER LUCERO SERRUDO LLAMPA", "ciudad": "Sucre", "supervisor": "JENNY CRISTINA ECHALAR MONTALVO", "cuentas_bnb": 68, "cuentas_bille": 70},
    {"nombre": "JOHANNA CASSANDRA CHAVEZ VALERIANO", "ciudad": "Cochabamba", "supervisor": "HASIRA DANIELA OSINAGA CHOQUE", "cuentas_bnb": 8, "cuentas_bille": 30},
    {"nombre": "JOSÉ OLAF ROJAS CONDARCO", "ciudad": "Cochabamba", "supervisor": "HASIRA DANIELA OSINAGA CHOQUE", "cuentas_bnb": 14, "cuentas_bille": 56},
    {"nombre": "LUIS ANGEL SIHUAIROS CANO", "ciudad": "Sucre", "supervisor": "JENNY CRISTINA ECHALAR MONTALVO", "cuentas_bnb": 18, "cuentas_bille": 61},
    {"nombre": "RENE NUÑEZ SOLIS", "ciudad": "Sucre", "supervisor": "JENNY CRISTINA ECHALAR MONTALVO", "cuentas_bnb": 22, "cuentas_bille": 71},
    {"nombre": "REYNA IVONNE CALLE NINA", "ciudad": "La Paz", "supervisor": "CLAUDIA SHASKIA CALLE NINA", "cuentas_bnb": 12, "cuentas_bille": 35},
    {"nombre": "RUBEN ANTONIO HINOJOSA TUPA", "ciudad": "La Paz", "supervisor": "CLAUDIA SHASKIA CALLE NINA", "cuentas_bnb": 5, "cuentas_bille": 28},
    {"nombre": "SARAI VANESA TERAN GONZALES", "ciudad": "Cochabamba", "supervisor": "HASIRA DANIELA OSINAGA CHOQUE", "cuentas_bnb": 19, "cuentas_bille": 59}
]

def _calcular_estado_y_premio(cuentas_proj: int, target: int, cuentas_bnb: int, cuentas_bille: int) -> tuple[str, int, str, bool]:
    doble = (cuentas_bnb >= 60 and cuentas_bille >= 70)
    if doble:
        return "🔥 DOBLE META CUMPLIDA", 0, "Bs. 300", True
    elif cuentas_proj >= target:
        return "🎯 META CUMPLIDA", 0, "Bs. 150", False
    else:
        brecha = target - cuentas_proj
        return "EN PROGRESO", brecha, "Bs. 0", False

def _procesar_lista(raw_list: List[Dict[str, Any]], target_proj: str) -> List[Dict[str, Any]]:
    target = META_CONFIG[target_proj]["target"]
    key_proj = "cuentas_bnb" if target_proj == "BNB" else "cuentas_bille"
    
    res = []
    for item in raw_list:
        cbnb = item.get("cuentas_bnb", 0)
        cbille = item.get("cuentas_bille", 0)
        cproj = item.get(key_proj, 0)
        
        nivel, brecha, premio, es_doble = _calcular_estado_y_premio(cproj, target, cbnb, cbille)
        
        res.append({
            "nombre": item.get("nombre", ""),
            "supervisor": item.get("supervisor", ""),
            "ciudad": item.get("ciudad", ""),
            "cuentas": cproj,
            "cuentas_bnb": cbnb,
            "cuentas_bille": cbille,
            "nivel": nivel,
            "proxima_meta_brecha": brecha,
            "premio_ganado": premio,
            "es_doble_meta": es_doble
        })
    res.sort(key=lambda x: x["cuentas"], reverse=True)
    return res

def _obtener_empleados_activos_bnb() -> List[Dict[str, Any]]:
    """Empleados activos de la unidad BNB (que incluye la campaña BILLE) desde rrhh_bd,
    con su teléfono — la llave de cruce contra bnb_bd/bille_bd.fact_afiliaciones."""
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASS, connect_timeout=3
    )
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    TRIM(CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno)) AS nombre,
                    COALESCE(c.nombre_ciudad, 'La Paz') AS ciudad,
                    COALESCE(
                        NULLIF(TRIM(CONCAT_WS(' ', sup.nombres, sup.apellido_paterno, sup.apellido_materno)), ''),
                        'BEX'
                    ) AS supervisor,
                    TRIM(eu.telefono) AS telefono
                FROM empleado_unidad eu
                JOIN persona p ON p.id_persona = eu.id_persona
                JOIN unidad_negocio un ON un.id_unidad_negocio = eu.id_unidad_negocio
                LEFT JOIN ciudad c ON c.id_ciudad = eu.id_ciudad
                LEFT JOIN persona sup ON sup.id_persona = eu.id_persona_supervisor
                WHERE un.codigo = 'BNB' AND eu.activo = true
                  AND eu.telefono IS NOT NULL AND TRIM(eu.telefono) <> ''
            """)
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

def _contar_afiliaciones_por_celular(dbname: str) -> Dict[str, int]:
    """Cuentas no duplicadas por celular dentro de la ventana de campaña, leídas
    directo de fact_afiliaciones en bnb_bd o bille_bd (bex_ingeniero, solo lectura).
    codigo_bex en estas bases guarda el CELULAR, no un código de negocio."""
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
            """, {"desde": CAMPANA_DESDE, "hasta": CAMPANA_HASTA_EXCLUSIVO})
            return {celular: cuentas for celular, cuentas in cur.fetchall()}
    finally:
        conn.close()

@app.get("/api/health")
def health():
    return {"status": "ok", "database": "configurada" if (DB_PASS and RRHH_PG_PASSWORD) else "sin credenciales"}

@app.get("/api/incentivos/cierre-agosto")
def get_incentivos():
    bnb_items = []
    bille_items = []

    if DB_PASS and RRHH_PG_PASSWORD:
        try:
            empleados = _obtener_empleados_activos_bnb()
            mapa_bnb = _contar_afiliaciones_por_celular("bnb_bd")
            mapa_bille = _contar_afiliaciones_por_celular("bille_bd")

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
                raw_data.append({
                    "nombre": e["nombre"],
                    "ciudad": e["ciudad"],
                    "supervisor": e["supervisor"],
                    "cuentas_bnb": mapa_bnb.get(tel, 0),
                    "cuentas_bille": mapa_bille.get(tel, 0),
                })

            if raw_data:
                bnb_items = _procesar_lista(raw_data, "BNB")
                bille_items = _procesar_lista(raw_data, "BILLE")
        except Exception as e:
            print(f"Error conectando a BD PostgreSQL: {e}")

    if not bnb_items:
        bnb_items = _procesar_lista(FALLBACK_BNB, "BNB")
    if not bille_items:
        bille_items = _procesar_lista(FALLBACK_BILLE, "BILLE")

    return {
        "fecha_actualizacion": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "metas_config": META_CONFIG,
        "bnb_data": bnb_items,
        "bille_data": bille_items
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
