param(
    [string]$ApiUrl = "https://centercrm-api.onrender.com",
    [int]$MaxAttempts = 40,
    [int]$IntervalSeconds = 30
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ApiUrl = $ApiUrl.TrimEnd("/")

Write-Host "Waiting for API at $ApiUrl/health ..."
$healthy = $false
for ($i = 1; $i -le $MaxAttempts; $i++) {
    try {
        $r = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 25
        if ($r.status -eq "ok") {
            Write-Host "API is healthy (attempt $i)."
            $healthy = $true
            break
        }
    } catch {
        Write-Host "Attempt ${i}/${MaxAttempts}: not ready yet..."
    }
    Start-Sleep -Seconds $IntervalSeconds
}

if (-not $healthy) {
    Write-Error "API did not become healthy at $ApiUrl"
    exit 1
}

Set-Location $Root
& "$Root\scripts\smoke-test-api.ps1" -ApiUrl $ApiUrl
& "$Root\scripts\deploy-firebase.ps1" -ApiUrl $ApiUrl

Write-Host ""
Write-Host "Production deploy complete!"
Write-Host "  API:  $ApiUrl"
Write-Host "  App:  https://autoparts-lms.web.app/login/master/"
