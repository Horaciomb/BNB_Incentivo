$ErrorActionPreference = "Stop"
$Caddyfile = "C:\Caddy\Caddyfile"
$Sello = Get-Date -Format "yyyyMMdd-HHmmss"
$Backup = "C:\Caddy\Caddyfile.bak_$Sello"
Copy-Item $Caddyfile $Backup
Write-Output "Backup creado: $Backup"

$utf8Bom = New-Object System.Text.UTF8Encoding($true)
$lineas = [System.IO.File]::ReadAllLines($Caddyfile, $utf8Bom)

$vieja = "`t`turi strip_prefix /convocatoria/bnb/api"
$nueva = "`t`turi strip_prefix /convocatoria/bnb"

$idx = [Array]::IndexOf($lineas, $vieja)
if ($idx -lt 0) {
    Write-Output "ERROR: no se encontro la linea a corregir. No se modifico nada."
    exit 1
}
Write-Output "Corrigiendo linea $($idx + 1): '$($lineas[$idx])' -> '$nueva'"
$lineas[$idx] = $nueva

[System.IO.File]::WriteAllLines($Caddyfile, $lineas, $utf8Bom)
Write-Output "Corregido OK."
