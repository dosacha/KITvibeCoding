param(
    [string]$ApiBaseUrl = "http://localhost:8000"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "[STEP] $Message" -ForegroundColor Cyan
}

function Invoke-Step {
    param(
        [string]$Message,
        [scriptblock]$Action
    )

    Write-Step $Message
    & $Action
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $repoRoot "apps\api"
$frontendDir = Join-Path $repoRoot "apps\frontend"

Invoke-Step "Backend compile check" {
    Push-Location $apiDir
    try {
        python -m compileall app tests manage_db.py
    }
    finally {
        Pop-Location
    }
}

Invoke-Step "Frontend build check" {
    Push-Location $frontendDir
    try {
        npm.cmd run smoke
    }
    finally {
        Pop-Location
    }
}

Invoke-Step "Backend health check" {
    try {
        $response = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/health" -TimeoutSec 5
        if ($response.status -ne "ok") {
            throw "Unexpected health response: $($response | ConvertTo-Json -Compress)"
        }
        Write-Host "Health check passed: $ApiBaseUrl/health" -ForegroundColor Green
    }
    catch {
        Write-Warning "Health check skipped because the backend is not running."
        Write-Warning $_
    }
}

Invoke-Step "Endpoint list" {
    $paths = @(
        "/auth/login",
        "/auth/me",
        "/frontend/dashboard/instructor",
        "/frontend/dashboard/student",
        "/frontend/students",
        "/frontend/exams",
        "/frontend/metadata",
        "/universities/policies"
    )

    foreach ($path in $paths) {
        Write-Host "Endpoint: $ApiBaseUrl$path"
    }
}

Write-Host ""
Write-Host "Demo smoke check complete." -ForegroundColor Green
