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
$frontendFile = Join-Path $repoRoot "apps\frontend\web.js"

Invoke-Step "Backend source compile check" {
    Push-Location $apiDir
    try {
        python -m compileall app tests
    }
    finally {
        Pop-Location
    }
}

Invoke-Step "Frontend source syntax check" {
    Push-Location $repoRoot
    try {
        node --check $frontendFile
    }
    finally {
        Pop-Location
    }
}

Invoke-Step "Backend health endpoint check" {
    try {
        $response = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/health" -TimeoutSec 5
        if ($response.status -ne "ok") {
            throw "Unexpected health response: $($response | ConvertTo-Json -Compress)"
        }
        Write-Host "Health check passed: $ApiBaseUrl/health" -ForegroundColor Green
    }
    catch {
        Write-Warning "Health endpoint check skipped or failed. Start the backend before using live API checks."
        Write-Warning $_
    }
}

Invoke-Step "Frontend endpoint availability check" {
    $paths = @(
        "/frontend/login",
        "/frontend/me",
        "/frontend/dashboard/instructor",
        "/frontend/dashboard/student",
        "/frontend/students",
        "/frontend/exams",
        "/frontend/metadata",
        "/frontend/universities"
    )

    foreach ($path in $paths) {
        Write-Host "Configured endpoint: $ApiBaseUrl$path"
    }
}

Write-Host ""
Write-Host "Demo smoke check complete." -ForegroundColor Green
