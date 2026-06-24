param(
  [string]$OutputDir = ".\backups",
  [string]$DatabaseUrl = $env:DATABASE_URL
)

if (-not $DatabaseUrl) { throw "DATABASE_URL is required" }
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = Join-Path $OutputDir "ciphervote-$stamp.dump"
pg_dump $DatabaseUrl --format=custom --file=$file
Write-Output "Backup written: $file"
