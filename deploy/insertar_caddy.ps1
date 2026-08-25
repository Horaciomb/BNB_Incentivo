# Inserta el snippet de /convocatoria/bnb/ en C:\Caddy\Caddyfile, con respaldo previo.
# Se ejecuta EN EL SERVIDOR. Preserva encoding UTF-8 con BOM (el archivo original lo tiene).
# Ubica el punto de insercion por NUMERO DE LINEA (una linea antes del ancla), no por texto
# exacto de la linea divisoria -- el archivo no es consistente en cuantos guiones usa cada una.
$ErrorActionPreference = "Stop"

$Caddyfile = "C:\Caddy\Caddyfile"
$Snippet   = "C:\Caddy\_tmp_snippet_convocatoria.txt"
$Sello     = Get-Date -Format "yyyyMMdd-HHmmss"
$Backup    = "C:\Caddy\Caddyfile.bak_$Sello"

Copy-Item $Caddyfile $Backup
Write-Output "Backup creado: $Backup"

$utf8Bom = New-Object System.Text.UTF8Encoding($true)
$lineas  = [System.IO.File]::ReadAllLines($Caddyfile, $utf8Bom)
$snippetLineas = [System.IO.File]::ReadAllLines($Snippet, $utf8Bom)

$ancla = "`t# Ocupacion del VPS por unidad (diagrama estatico, tareas programadas)"
$idxAncla = [Array]::IndexOf($lineas, $ancla)
if ($idxAncla -lt 0) {
    Write-Output "ERROR: no se encontro el ancla de insercion. No se modifico nada."
    exit 1
}

$idxDivisoria = $idxAncla - 1
Write-Output "Ancla en linea $($idxAncla + 1): '$($lineas[$idxAncla])'"
Write-Output "Insertando antes de linea $($idxDivisoria + 1): '$($lineas[$idxDivisoria])'"

$antes    = $lineas[0..($idxDivisoria - 1)]
$despues  = $lineas[$idxDivisoria..($lineas.Count - 1)]
$nuevo    = $antes + $snippetLineas + $despues

[System.IO.File]::WriteAllLines($Caddyfile, $nuevo, $utf8Bom)
Write-Output "Insertado OK. Lineas antes: $($lineas.Count) / despues: $($nuevo.Count)"
