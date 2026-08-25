param(
    [switch]$PermitirArbolSucio
)

. "$PSScriptRoot\_comun.ps1"
$root = $Repo

Write-Host ">> Deploy backend - Incentivos Cierre Agosto (BNB)" -ForegroundColor Cyan

# Guarda de arbol limpio, mismo motivo que rrhh-app/deploy/deploy-backend.ps1:
# scp copia el WORKING TREE, no un commit.
$sucio = git -C $root status --porcelain -- server.py requirements.txt
if ($sucio -and -not $PermitirArbolSucio) {
    Write-Host "ERROR: hay cambios sin commitear en server.py o requirements.txt." -ForegroundColor Red
    Write-Host "       scp copia el working tree, no un commit: esto se iria a PRODUCCION." -ForegroundColor Red
    Write-Host ""
    $sucio | ForEach-Object { Write-Host "       $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "       Commitea, o corre con -PermitirArbolSucio si es a proposito." -ForegroundColor DarkGray
    exit 1
}

$rama   = (git -C $root rev-parse --abbrev-ref HEAD).Trim()
$local  = (git -C $root rev-parse HEAD).Trim()
$remoto = (git -C $root rev-parse "origin/$rama" 2>$null)
Write-Host "-> Desplegando $rama @ $($local.Substring(0,7))" -ForegroundColor DarkGray
if ($remoto -and $local -ne $remoto.Trim()) {
    Write-Host "   AVISO: HEAD difiere de origin/$rama - lo que se despliega no esta pusheado." -ForegroundColor Yellow
}

Write-Host "-> Subiendo codigo del backend (server.py -> api/main.py)..."
ssh $Servidor "if not exist $AppDir\api mkdir $AppDir\api"
scp "$root\server.py" "${Servidor}:/$AppDir/api/main.py"
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: scp server.py fallo" -ForegroundColor Red; exit 1 }

scp "$root\requirements.txt" "${Servidor}:/$AppDir/api/requirements.txt"
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: scp requirements.txt fallo" -ForegroundColor Red; exit 1 }

Write-Host "-> Instalando dependencias en el venv compartido de BNB..."
ssh $Servidor "uv pip install --python $PyVenv -r $AppDir/api/requirements.txt"
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: uv pip install fallo" -ForegroundColor Red; exit 1 }

Write-Host "-> Deteniendo servicio $Servicio..."
ssh $Servidor "sc stop $Servicio" | Out-Null

$parado = $false
foreach ($i in 1..15) {
    Start-Sleep -Seconds 2
    $estado = ssh $Servidor "sc query $Servicio"
    if ($estado -match "STOPPED") { $parado = $true; break }
}
if (-not $parado) {
    Write-Host "ERROR: el servicio no llego a STOPPED en 30s. Revisar a mano." -ForegroundColor Red
    exit 1
}

Write-Host "-> Arrancando servicio $Servicio..."
ssh $Servidor "sc start $Servicio" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: sc start fallo. EL SERVICIO QUEDA DETENIDO - levantarlo a mano:" -ForegroundColor Red
    Write-Host "       ssh $Servidor `"sc start $Servicio`"" -ForegroundColor Red
    exit 1
}

Write-Host "-> Verificando /api/health (via localhost en el servidor, aun sin ruta Caddy)..."
Start-Sleep -Seconds 3
$health = ssh $Servidor "powershell -Command `"(Invoke-RestMethod -Uri 'http://127.0.0.1:8221/api/health' -TimeoutSec 10 | ConvertTo-Json -Compress)`""
if ($LASTEXITCODE -ne 0 -or -not $health) {
    Write-Host "ERROR: /api/health no respondio. Log: $AppDir\api\logs (si esta configurado) o Visor de eventos." -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "Backend desplegado. /api/health => $health" -ForegroundColor Green
Write-Host "AVISO: database puede decir 'sin credenciales' hasta que crees el .env en $AppDir\api\.env" -ForegroundColor Yellow
