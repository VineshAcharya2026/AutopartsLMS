param(
    [Parameter(Mandatory = $true)]
    [string]$BackendUrl
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$BackendUrl = $BackendUrl.TrimEnd("/")
$AppHostingFile = Join-Path $Root "apps\web\apphosting.yaml"

Write-Host "Checking Blaze plan / App Hosting access..."
$check = firebase apphosting:backends:list --project autoparts-lms 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host $check
    Write-Host ""
    Write-Host "App Hosting requires Blaze plan. Upgrade here:"
    Write-Host "https://console.firebase.google.com/project/autoparts-lms/usage/details"
    exit 1
}

(Get-Content $AppHostingFile -Raw) `
    -replace "value: https://REPLACE-WITH-YOUR-API-URL", "value: $BackendUrl" `
    | Set-Content $AppHostingFile -NoNewline

Write-Host "Deploying App Hosting (backend: web, API proxy: $BackendUrl)..."
firebase deploy --only apphosting:web --project autoparts-lms
