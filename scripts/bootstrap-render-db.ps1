param(
    [Parameter(Mandatory = $true)]
    [string]$DatabaseUrl
)

$ErrorActionPreference = "Stop"
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

Write-Host "Pushing Prisma schema to production database..."
npx prisma db push --accept-data-loss --skip-generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Seeding default users..."
python seed.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Database bootstrap complete."
