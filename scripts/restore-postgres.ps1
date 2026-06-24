param(
  [Parameter(Mandatory=$true)][string]$BackupFile,
  [string]$DatabaseUrl = $env:DATABASE_URL
)

if (-not $DatabaseUrl) { throw "DATABASE_URL is required" }
if (-not (Test-Path $BackupFile)) { throw "Backup file not found: $BackupFile" }
pg_restore --clean --if-exists --dbname=$DatabaseUrl $BackupFile
Write-Output "Restore completed from: $BackupFile"
