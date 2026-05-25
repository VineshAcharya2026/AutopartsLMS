param(
    [Parameter(Mandatory = $true)]
    [string]$ApiUrl
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$ApiUrl = $ApiUrl.TrimEnd("/")
$ApiBase = "$ApiUrl/api/v1"
$WsUrl = $ApiUrl -replace "^https://", "wss://" -replace "^http://", "ws://"
$WsUrl = "$WsUrl/ws/notifications"

Write-Host "Building frontend for Firebase Hosting..."
Write-Host "  API: $ApiBase"
Write-Host "  WS:  $WsUrl"

$env:FIREBASE_BUILD = "1"
$env:NEXT_PUBLIC_API_URL = $ApiBase
$env:NEXT_PUBLIC_WS_URL = $WsUrl

npm run build -w @centercrm/web
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deploying to Firebase Hosting (autoparts-lms)..."
firebase deploy --only hosting --project autoparts-lms
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Done! Open https://autoparts-lms.web.app/login/"
