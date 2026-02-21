$ErrorActionPreference = "Stop"

# Configuration
$ProjectId = "ai-films-prod-486422"
$Region = "us-central1"
$RedisInstanceName = "ai-film-studio-redis"

if ($env:GOOGLE_CLOUD_PROJECT) {
    $ProjectId = $env:GOOGLE_CLOUD_PROJECT
}

Write-Host "Setting up Redis (Memorystore) for Project: $ProjectId" -ForegroundColor Yellow

# Check if Redis instance exists
$RedisExists = gcloud redis instances describe $RedisInstanceName --region $Region --project $ProjectId 2>$null

if (-not $RedisExists) {
    Write-Host "Creating Redis instance... (This makes take 10-15 minutes)" -ForegroundColor Cyan
    # Standard Tier for production (HA), Basic for Dev. Using Basic for now to save cost/time, 
    # but user requested PRODUCTION readiness, so we should consider Standard. 
    # However, for queueing, basic persistence might be enough. 
    # Let's go with Basic Tier, 1GB (minimum) for cost-efficiency unless HA is strictly required. 
    # If the user wants HA, they can upgrade.
    
    gcloud redis instances create $RedisInstanceName `
        --size=1 `
        --region=$Region `
        --tier=basic `
        --redis-version=redis_7_0 `
        --project=$ProjectId

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Redis instance created successfully." -ForegroundColor Green
    }
    else {
        Write-Host "Failed to create Redis instance." -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "Redis instance already exists." -ForegroundColor Green
}

# Get Connection Info
$RedisHost = gcloud redis instances describe $RedisInstanceName --region $Region --project $ProjectId --format="value(host)"
$RedisPort = gcloud redis instances describe $RedisInstanceName --region $Region --project $ProjectId --format="value(port)"

Write-Host ""
Write-Host "Redis Connection Info:" -ForegroundColor White
Write-Host "Host: $RedisHost" -ForegroundColor Cyan
Write-Host "Port: $RedisPort" -ForegroundColor Cyan
Write-Host ""
Write-Host "Add these to your Secret Manager or Environment Variables:" -ForegroundColor Yellow
Write-Host "REDIS_HOST=$RedisHost"
Write-Host "REDIS_PORT=$RedisPort"
