# Comprueba la app DESDE FUERA, contra la URL publica, atravesando Caddy.
# Se ejecuta en la maquina de desarrollo, no en el servidor.
#
# Por que existe: deploy-backend.ps1 verifica /api/health por 127.0.0.1:8221
# DENTRO del servidor, asi que pasa aunque la ruta de Caddy no exista. Ese es
# justo el fallo del 28-ago-2026: el backend vivo y la app en 404 para todo el
# mundo. Estas comprobaciones lo habrian visto.
#
# Uso:  .\deploy\verificar_produccion.ps1
#       .\deploy\verificar_produccion.ps1 -Url http://127.0.0.1:8000   (contra local)
param(
    [string]$Url
)

. "$PSScriptRoot\_comun.ps1"
if (-not $Url) { $Url = $UrlPublica }
$Url = $Url.TrimEnd('/')

# PowerShell 5.1 negocia TLS 1.0 por defecto y el servidor no lo acepta.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$fallos = 0
function Bien($msg) { Write-Host "  OK    $msg" -ForegroundColor Green }
function Mal($msg)  { Write-Host "  FALLO $msg" -ForegroundColor Red; $script:fallos++ }
function Comprobar($ok, $msg) { if ($ok) { Bien $msg } else { Mal $msg } }

# Invoke-WebRequest de 5.1 lanza excepcion con cualquier codigo != 2xx y sigue
# las redirecciones sin poder evitarlo, y las dos cosas son justo lo que hay que
# medir aqui. HttpWebRequest da el codigo crudo y las cabeceras tal cual.
function Pedir {
    param(
        [string]$Ruta,
        [string]$Metodo = "GET",
        [hashtable]$Cabeceras = @{}
    )
    $req = [System.Net.HttpWebRequest]::Create("$Url$Ruta")
    $req.Method = $Metodo
    $req.AllowAutoRedirect = $false
    $req.Timeout = 25000
    $req.UserAgent = "verificar_produccion.ps1"
    foreach ($k in $Cabeceras.Keys) { $req.Headers.Add($k, $Cabeceras[$k]) }

    try {
        $resp = $req.GetResponse()
    } catch [System.Net.WebException] {
        $resp = $_.Exception.Response
        if (-not $resp) { throw }
    }

    $cuerpo = ""
    $flujo = $resp.GetResponseStream()
    if ($flujo) {
        $lector = New-Object System.IO.StreamReader($flujo)
        $cuerpo = $lector.ReadToEnd()
        $lector.Close()
    }
    $cab = @{}
    foreach ($n in $resp.Headers.AllKeys) { $cab[$n] = $resp.Headers[$n] }
    $codigo = [int]$resp.StatusCode
    $resp.Close()

    [pscustomobject]@{ Codigo = $codigo; Cuerpo = $cuerpo; Cabeceras = $cab }
}

Write-Host ">> Verificando $Url" -ForegroundColor Cyan
Write-Host ""

# --- 1. La ruta de Caddy sigue montada -------------------------------------
# En positivo, no por el 404: desde el 05-sep-2026 la regla global @no_publicos
# devuelve un 404 con cabeceras identicas a las de una ruta inexistente, asi que
# "da 404" ya no distingue nada. Lo que si es exclusivo de este bloque son su
# CSP propia (sin unpkg.com) y el borrado de la cabecera Server.
Write-Host "[1] Ruta de Caddy" -ForegroundColor White
$raiz = Pedir "/"
Comprobar ($raiz.Codigo -eq 200) "GET / responde 200 (fue $($raiz.Codigo))"
$csp = $raiz.Cabeceras["Content-Security-Policy"]
Comprobar ($csp -and $csp -notmatch "unpkg\.com") "sirve la CSP propia del bloque, no la generica del sitio"
Comprobar (-not $raiz.Cabeceras["Server"]) "sin cabecera Server (el bloque hace -Server)"
Comprobar ($raiz.Cuerpo -match "<div id=`"root`"></div>") "el HTML es el del panel (tiene #root)"

$sinBarra = [System.Net.HttpWebRequest]::Create($Url)
$sinBarra.AllowAutoRedirect = $false
$sinBarra.Timeout = 25000
try { $r = $sinBarra.GetResponse() } catch [System.Net.WebException] { $r = $_.Exception.Response }
$codigoSinBarra = [int]$r.StatusCode
$r.Close()
Comprobar ($codigoSinBarra -eq 301) "sin barra final redirige 301 (fue $codigoSinBarra)"

# --- 2. Los estaticos del build --------------------------------------------
Write-Host "[2] Estaticos" -ForegroundColor White
$activos = [regex]::Matches($raiz.Cuerpo, '/assets/[A-Za-z0-9_.-]+') | ForEach-Object { $_.Value } | Select-Object -Unique
Comprobar ($activos.Count -ge 2) "index.html referencia $($activos.Count) activos"
foreach ($a in $activos) {
    $res = Pedir $a
    Comprobar ($res.Codigo -eq 200) "$a responde 200 (fue $($res.Codigo))"
}

# --- 3. El backend a traves de Caddy ---------------------------------------
Write-Host "[3] Backend" -ForegroundColor White
$salud = Pedir "/api/health"
Comprobar ($salud.Codigo -eq 200) "/api/health responde 200 (fue $($salud.Codigo))"
if ($salud.Codigo -eq 200) {
    $j = $salud.Cuerpo | ConvertFrom-Json
    Comprobar ($j.status -eq "ok") "status = $($j.status)"
    # "configurada" solo dice que las variables no estan vacias, no que conecten:
    # lo que de verdad detecta una clave mala es es_respaldo, mas abajo.
    Comprobar ($j.database -eq "configurada") "database = $($j.database)"
    Comprobar ($j.campanas_cargadas -gt 0) "campanas_cargadas = $($j.campanas_cargadas)"
    Comprobar ($null -eq $j.error_config) "sin error_config"
}

# --- 4. Datos reales, no el roster de respaldo ------------------------------
Write-Host "[4] Campanas" -ForegroundColor White
$listado = Pedir "/api/campanas"
Comprobar ($listado.Codigo -eq 200) "/api/campanas responde 200 (fue $($listado.Codigo))"
if ($listado.Codigo -eq 200) {
    $campanas = ($listado.Cuerpo | ConvertFrom-Json).campanas
    Comprobar ($campanas.Count -gt 0) "$($campanas.Count) campanas visibles"
    foreach ($c in $campanas) {
        $inc = Pedir "/api/incentivos/$($c.id)"
        if ($inc.Codigo -ne 200) {
            Mal "$($c.id) responde $($inc.Codigo)"
            continue
        }
        $d = $inc.Cuerpo | ConvertFrom-Json
        # es_respaldo true = esta sirviendo datos de demostracion. Pasa con las
        # credenciales mal o la BD caida, y la app NO se cae por eso.
        Comprobar (-not $d.es_respaldo) "$($c.id): datos reales ($($d.afiliadores.Count) afiliadores, es_respaldo=$($d.es_respaldo))"
    }
}

# --- 5. CORS restringido ----------------------------------------------------
Write-Host "[5] CORS" -ForegroundColor White
$propio = Pedir "/api/campanas" "OPTIONS" @{
    "Origin" = "https://srv.beneficioslatam.com"
    "Access-Control-Request-Method" = "GET"
}
Comprobar ($propio.Cabeceras["Access-Control-Allow-Origin"]) "preflight del origen propio trae Allow-Origin"
$ajeno = Pedir "/api/campanas" "OPTIONS" @{
    "Origin" = "https://origen-ajeno.example"
    "Access-Control-Request-Method" = "GET"
}
Comprobar (-not $ajeno.Cabeceras["Access-Control-Allow-Origin"]) "preflight de un origen ajeno no trae Allow-Origin"

Write-Host ""
if ($fallos -eq 0) {
    Write-Host "Todo OK." -ForegroundColor Green
    exit 0
}
Write-Host "$fallos comprobaciones fallidas." -ForegroundColor Red
exit 1
