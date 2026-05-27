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
$env:NODE_ENV = "production"
$env:NEXT_PUBLIC_API_URL = $ApiBase
$env:NEXT_PUBLIC_WS_URL = $WsUrl
# Prevent apps/web/.env.local from overriding production API URL during build
Remove-Item Env:BACKEND_URL -ErrorAction SilentlyContinue

npm run build -w @centercrm/web
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$chunk = Get-ChildItem "$Root\apps\web\out\_next\static\chunks\*.js" -ErrorAction SilentlyContinue |
  Select-String -Pattern "centercrm-api.onrender.com" -List -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $chunk) {
  Write-Warning "Build may be missing production API URL in bundle (runtime fallback still applies on Firebase hosts)."
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deploying to Firebase Hosting (lmsportal-e05d7)..."
firebase deploy --only hosting --project lmsportal-e05d7
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Done! Open https://lmsportal-e05d7.web.app/login/"
