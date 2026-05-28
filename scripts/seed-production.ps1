param(
    [Parameter(Mandatory = $false)]
    [string]$DatabaseUrl = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"
if (-not $DatabaseUrl) {
    Write-Error "Set DATABASE_URL or pass -DatabaseUrl (Render Postgres external URL)."
}

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$DbDir = Join-Path $Root "packages\database"

if ($DatabaseUrl -notmatch 'sslmode=') {
    if ($DatabaseUrl -match 'render\.com|dpg-') {
        $sep = if ($DatabaseUrl -match '\?') { '&' } else { '?' }
        $DatabaseUrl = "$DatabaseUrl${sep}sslmode=require"
    }
}

$env:DATABASE_URL = $DatabaseUrl
Set-Location $DbDir

Write-Host "Running demo seed against database..."
python seed.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Log in as master@centercrm.com and check Lead Center."
