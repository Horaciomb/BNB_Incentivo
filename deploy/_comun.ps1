# Resolucion de rutas compartida por los scripts de deploy. Se usa con dot-sourcing:
#     . "$PSScriptRoot\_comun.ps1"
# Patron calcado de rrhh-app/deploy/_comun.ps1: guarda de que el repo es el correcto,
# rutas resueltas una sola vez (nada de $PSScriptRoot dentro de funciones).

$Deploy = $PSScriptRoot
$Repo   = Split-Path $Deploy -Parent

if (-not (Test-Path (Join-Path $Repo "server.py")) -or -not (Test-Path (Join-Path $Repo "src"))) {
    Write-Host "ERROR: '$Repo' no parece la raiz del repo (falta server.py o src\)." -ForegroundColor Red
    Write-Host "       Estos scripts esperan vivir en <repo>\deploy\." -ForegroundColor Red
    exit 1
}

$Servidor = "Administrator@10.0.0.2"
$Servicio = "web_bnb_convocatoria"
$AppDir   = "C:/Proyectos/BNB/web/convocatoria"
$PyVenv   = "C:\uv-envs\bnb\Scripts\python.exe"
