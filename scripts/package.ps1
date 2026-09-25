<#
package.ps1
Gera um ZIP independente para cada criativo. Cada arquivo contém somente
index.html, video.mp4 e logo.gif daquele anúncio.
#>
$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DistDirectory = Join-Path $ProjectRoot 'dist'
$PackageDirectory = Join-Path $ProjectRoot 'packages'
if (-not (Test-Path -LiteralPath $DistDirectory)) { throw 'dist/ não encontrado. Gere os criativos antes de empacotar.' }
New-Item -ItemType Directory -Force -Path $PackageDirectory | Out-Null
$creativeDirectories = Get-ChildItem -LiteralPath $DistDirectory -Directory
if ($creativeDirectories.Count -ne 180) { throw "Esperadas 180 pastas em dist/; encontradas $($creativeDirectories.Count)." }
$index = 0
foreach ($creativeDirectory in $creativeDirectories) {
    $index++
    $zipPath = Join-Path $PackageDirectory ($creativeDirectory.Name + '.zip')
    if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
    Compress-Archive -LiteralPath (Join-Path $creativeDirectory.FullName 'index.html'), (Join-Path $creativeDirectory.FullName 'video.mp4'), (Join-Path $creativeDirectory.FullName 'logo.gif') -DestinationPath $zipPath
    Write-Host "[$index/180] ZIP criado: $($creativeDirectory.Name).zip"
}
Write-Host "`nPacotes criados: $index/180 em packages/."
