. "$PSScriptRoot\_comun.ps1"
$root = $Repo

Write-Host ">> Deploy frontend - Incentivos Cierre Agosto (BNB)" -ForegroundColor Cyan

# A diferencia de rrhh-app, esta carpeta del servidor mezcla estaticos + backend
# (mismo patron que C:\Proyectos\BNB\web\afilia\bille): el frontend vive junto a
# api\. El swap NO puede ser "borrar todo y reemplazar" como en rrhh-app, porque
# se llevaria api\ por delante. Se sube a un temporal, se verifica, y se mergea
# con robocopy /MIR /XD api -- api\ queda excluido de la sincronizacion, así que
# nunca se toca desde este script.

$volver = Get-Location

Write-Host "-> Construyendo frontend..."
Set-Location $root
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: build fallo" -ForegroundColor Red; Set-Location $volver; exit 1 }

$Sello = Get-Date -Format "yyyyMMdd-HHmmss"
$WebParent = "C:/Proyectos/BNB/web"
$Tmp = "$WebParent/_deploy_tmp_convocatoria_$Sello"

Write-Host "-> Subiendo nueva version a $Tmp..."
ssh $Servidor "if not exist $WebParent\_deploy_tmp_convocatoria_$Sello mkdir $WebParent\_deploy_tmp_convocatoria_$Sello"
scp -o ConnectTimeout=30 -r ".\dist\*" "${Servidor}:/$Tmp/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: scp fallo - la app SIGUE ARRIBA con la version anterior" -ForegroundColor Red
    ssh $Servidor "rmdir /s /q $($Tmp -replace '/','\')" 2>$null
    Set-Location $volver
    exit 1
}

Write-Host "-> Verificando que el bundle subio completo..."
$chequeo = ssh $Servidor "if exist $($Tmp -replace '/','\')\index.html (echo INDEX_OK) else (echo INDEX_FALTA)"
if ($chequeo -notmatch "INDEX_OK") {
    Write-Host "ERROR: el temporal no tiene index.html ($chequeo) - NO se hace el merge" -ForegroundColor Red
    Write-Host "       La app sigue sirviendo la version anterior." -ForegroundColor Yellow
    Set-Location $volver
    exit 1
}

Write-Host "-> Mergeando (robocopy /MIR, excluyendo api\)..."
# Robocopy: 0-7 = distintos grados de exito, 8+ = fallo real.
ssh $Servidor "robocopy $($Tmp -replace '/','\') $($AppDir -replace '/','\') /MIR /XD api /NFL /NDL /NJH /NJS"
$rc = $LASTEXITCODE
if ($rc -ge 8) {
    Write-Host "ERROR: robocopy fallo con codigo $rc - revisar a mano en el servidor." -ForegroundColor Red
    Write-Host "       El temporal $Tmp se queda para inspeccionar/reintentar." -ForegroundColor Yellow
    Set-Location $volver
    exit 1
}

ssh $Servidor "rmdir /s /q $($Tmp -replace '/','\')" 2>$null

Set-Location $volver

Write-Host ""
Write-Host "Frontend desplegado." -ForegroundColor Green
Write-Host "   https://srv.beneficioslatam.com/convocatoria/bnb/"
Write-Host "   (requiere que el bloque de Caddy para /convocatoria/bnb/ ya este activo)" -ForegroundColor DarkGray
