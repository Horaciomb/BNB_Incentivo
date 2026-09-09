"""Shim mínimo para que `planilla_personal.py` viva acá sin arrastrar el
`comun/` completo del repo `BNB/procesos` (que trae cliente JotForm, ORM de
SQLAlchemy y la bitácora — nada de eso lo usa esta app).

`planilla_personal.py` solo importa estos dos símbolos. Se replican con el
mismo valor que en `comun/config.py`; si allá cambian, hay que reflejarlo acá
(ver la nota de sincronización en `personal/__init__.py`).
"""

from pathlib import Path

# Directorio de trabajo local. Solo se usa para el caché de la planilla
# (`DAT_DIR/cache/personal.xlsx`), que es el respaldo cuando Google no responde.
# Va junto al backend, no en el repo: en producción el servicio corre desde
# `C:\Proyectos\BNB\web\convocatoria\api\`.
DAT_DIR = Path(__file__).resolve().parent.parent / "dat"

# Códigos HTTP que Google devuelve de forma transitoria y que sí vale
# reintentar. El 400 está adrede: Google lo lanza esporádicamente en las URLs
# publicadas y sin él el reintento no ocurría nunca.
CODIGOS_HTTP_REINTENTABLES = frozenset({400, 408, 429, 500, 502, 503, 504})
