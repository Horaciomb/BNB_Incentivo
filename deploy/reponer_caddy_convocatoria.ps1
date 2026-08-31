# Repone el bloque /convocatoria/bnb/* que se perdio en la edicion de terceros del
# 28-ago-2026 (se edito el Caddyfile desde una copia vieja, sin backup previo).
# Se ejecuta EN EL SERVIDOR.
#
# El texto del bloque se toma de Caddyfile.bak_rumbo_geoloc (27-ago), NO de
# caddy_snippet_convocatoria.txt: el snippet del repo trae el strip_prefix viejo
# (/convocatoria/bnb/api) que ya se corrigio el 25-ago con fix_caddy_strip_prefix.ps1.
$ErrorActionPreference = "Stop"

$Caddyfile = "C:\Caddy\Caddyfile"
$Fuente    = "C:\Caddy\Caddyfile.bak_rumbo_geoloc"
$Sello     = Get-Date -Format "yyyyMMdd-HHmmss"
$Backup    = "C:\Caddy\Caddyfile.bak_pre_reponer_convocatoria_$Sello"

# Latin-1 mapea 1 byte <-> 1 char sin perdida: manipulamos el archivo como texto y
# reescribimos los MISMOS bytes (BOM y CRLF incluidos). Releerlo como UTF-8 convertiria
# el mojibake que ya arrastra (incidentes de encoding del 21-ago) en U+FFFD y danaria
# los acentos de los otros ~20 bloques de una sola pasada.
$L1 = [System.Text.Encoding]::GetEncoding(28591)
function Leer($ruta) { $L1.GetString([System.IO.File]::ReadAllBytes($ruta)) }

if (-not (Test-Path $Fuente)) { Write-Output "ERROR: no existe $Fuente."; exit 1 }

$txtFuente = Leer $Fuente
$txtActual = Leer $Caddyfile
$nl = if ($txtActual.Contains("`r`n")) { "`r`n" } else { "`n" }

# --- 1. Extraer el bloque del backup del 27-ago ---
$lf = $txtFuente -split "`r`n|`n"
$iIni = -1; $iOcup = -1
for ($i = 0; $i -lt $lf.Count; $i++) {
    if ($iIni  -lt 0 -and $lf[$i] -match 'BNB - Convocatoria Incentivos') { $iIni  = $i }
    if ($iOcup -lt 0 -and $lf[$i] -match 'Ocupacion del VPS por unidad')  { $iOcup = $i }
}
if ($iIni -lt 1 -or $iOcup -lt 2 -or $iOcup -le $iIni) {
    Write-Output "ERROR: no se ubico el bloque en $Fuente (iIni=$iIni iOcup=$iOcup). Sin cambios."
    exit 1
}
# Desde la divisoria superior hasta la linea previa a la divisoria del bloque Ocupacion.
$bloque = $lf[($iIni - 1)..($iOcup - 2)]

# --- 2. Guardas sobre lo extraido ---
$nConv = ($bloque | Where-Object { $_ -match 'convocatoria/bnb' }).Count
if ($nConv -ne 5) {
    Write-Output "ERROR: el bloque trae $nConv lineas 'convocatoria/bnb', se esperaban 5. Sin cambios."
    exit 1
}
if (-not ($bloque -match 'strip_prefix /convocatoria/bnb$')) {
    Write-Output "ERROR: el bloque no trae el strip_prefix corregido. Sin cambios."
    exit 1
}
Write-Output "Bloque extraido OK: $($bloque.Count) lineas, $nConv con convocatoria/bnb."

# --- 3. Ubicar el ancla en el Caddyfile actual ---
if ($txtActual -match 'convocatoria/bnb/\*') {
    Write-Output "ERROR: el Caddyfile YA tiene un bloque /convocatoria/bnb/*. Sin cambios."
    exit 1
}
# El ancla original de insertar_caddy.ps1 ('# Ocupacion del VPS por unidad') tambien
# desaparecio el 28-ago. Se usa /comun/*, que existe, es unico y no lleva acentos.
$la = $txtActual -split "`r`n|`n"
$iAncla = -1
for ($i = 0; $i -lt $la.Count; $i++) {
    if ($la[$i].Trim() -eq 'handle_path /comun/* {') { $iAncla = $i; break }
}
if ($iAncla -lt 1) {
    Write-Output "ERROR: no se encontro el ancla 'handle_path /comun/* {'. Sin cambios."
    exit 1
}
Write-Output "Ancla en linea $($iAncla + 1). Insertando el bloque antes."

# --- 4. Escribir ---
Copy-Item $Caddyfile $Backup
Write-Output "Backup: $Backup"

$nuevo  = @()
$nuevo += $la[0..($iAncla - 1)]
$nuevo += $bloque
$nuevo += $la[$iAncla..($la.Count - 1)]
[System.IO.File]::WriteAllBytes($Caddyfile, $L1.GetBytes(($nuevo -join $nl)))

# --- 5. Chequeo de integridad de codificacion ---
# El bloque insertado es ASCII puro: la cuenta de bytes >127 NO debe cambiar.
# Si cambia, la escritura corrompio acentos de otros bloques -> revertir solo.
$antes   = ([System.IO.File]::ReadAllBytes($Backup)    | Where-Object { $_ -gt 127 }).Count
$despues = ([System.IO.File]::ReadAllBytes($Caddyfile) | Where-Object { $_ -gt 127 }).Count
Write-Output "Bytes no-ASCII antes: $antes / despues: $despues"
if ($antes -ne $despues) {
    Copy-Item $Backup $Caddyfile -Force
    Write-Output "ERROR: la cuenta de bytes no-ASCII cambio. REVERTIDO desde $Backup."
    exit 1
}
Write-Output "Insertado OK. Lineas: $($la.Count) -> $($nuevo.Count)"
