param(
    [Parameter(Mandatory = $true)]
    [string]$ApiUrl
)

$ErrorActionPreference = "Stop"
$ApiUrl = $ApiUrl.TrimEnd("/")

Write-Host "Smoke testing $ApiUrl ..."

$health = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 30
Write-Host "Health: $($health | ConvertTo-Json -Compress)"

$oauth = Invoke-RestMethod -Uri "$ApiUrl/api/v1/auth/oauth/status" -TimeoutSec 30
Write-Host "OAuth status: $($oauth | ConvertTo-Json -Compress)"

$loginBody = @{ email = "master@centercrm.com"; password = "Admin@123" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$ApiUrl/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 60
Write-Host "Login OK for: $($login.user.email) role=$($login.user.role)"

Write-Host "All API smoke checks passed."
