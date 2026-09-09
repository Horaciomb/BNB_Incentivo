"""Roster de personal leído de la planilla publicada (Google Sheets).

`planilla_personal.py` es una **copia textual** de `comun/planilla_personal.py`
del repo `bexbolivia/bx_BNB` (rama main, commit e8a22e0), con un único cambio:
la línea de import pasó de `from comun.config import ...` a `from .config
import ...`. Nada más se tocó — mantenerlo así para poder diffear contra el
original cuando allá se corrija algo.

**Por qué una copia y no una reimplementación.** La app corre en el servidor,
donde el repo `procesos` no está desplegado, así que importarlo no es opción.
Y reescribir la lectura "solo con lo que la app necesita" es justamente donde
está el riesgo: el módulo resuelve dos trampas ya pagadas en producción — que
una persona tiene varios contratos y **el de ingreso más reciente no es el
vigente** (quien ascendió a supervisor conserva el de activador con fecha
posterior; en P10 eso marcó INACTIVO a tres personas activas), y el reintento
del HTTP 400 transitorio de Google. Copiar sale más barato que volver a
descubrir eso.

**Por qué la planilla y no `rrhh_bd`.** El roster salía de
`rrhh_bd.empleado_unidad` y perdía a todo el que RRHH no hubiera cargado ahí:
al 09-sep-2026 eran 22 afiliadores con producción real, el 26,5% de las
afiliaciones BILLE de la campaña de septiembre, y dos bonos sin pagar (Ariadna
Gisel Condori Blanco, 70 en 1-6 sep; Nelson Rodrigo Choque Garcia, 82 en 24-31
ago). La planilla los cubre a los 22. Es la misma conclusión a la que ya había
llegado P9, que abandonó `dim_ejecutivo` por esta fuente.
"""
