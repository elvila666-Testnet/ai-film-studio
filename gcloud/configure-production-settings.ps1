$ErrorActionPreference = "Stop"

# Configuration
$ProjectId = "ai-films-prod-486422"
$InstanceName = "ai-film-studio-db"

if ($env:GOOGLE_CLOUD_PROJECT) {
    $ProjectId = $env:GOOGLE_CLOUD_PROJECT
}

Write-Host "Configuring performance settings for Cloud SQL instance: $InstanceName" -ForegroundColor Yellow

# 1. Memory / Buffer Pool
# For a production instance, we want innodb_buffer_pool_size to be ~70% of RAM.
# Note: db-f1-micro is very small (0.6 GB RAM). 
# If running on f1-micro, we shouldn't set a huge buffer pool or it will OOM.
# We will check the tier first.

$Instance = gcloud sql instances describe $InstanceName --project $ProjectId --format="json" | ConvertFrom-Json
$Tier = $Instance.settings.tier

Write-Host "Current Tier: $Tier" -ForegroundColor Cyan

# Database Flags
$Flags = @()
$Flags += "slow_query_log=on"
$Flags += "long_query_time=2" # Log queries taking > 2s
$Flags += "log_output=TABLE"
$Flags += "max_connections=100" # Safe limit for smaller instances, scale up for larger

# Adjust buffer pool based on tier
if ($Tier -eq "db-f1-micro" -or $Tier -eq "db-g1-small") {
    Write-Host "Warning: Running on shared-core instance ($Tier). Skipping memory-intensive tuning." -ForegroundColor Yellow
    # Do not set fixed buffer pool on micro instances, let default handle it.
}
else {
    # Assume standard instance (e.g. db-n1-standard-1 has 3.75GB)
    # Set buffer pool to ~2GB for standard-1
    if ($Tier -like "*standard-1*") {
        $Flags += "innodb_buffer_pool_size=2147483648" 
    }
    # Add more logic here for larger instances if needed
}

$FlagsString = $Flags -join ","

Write-Host "Applying database flags: $FlagsString" -ForegroundColor Cyan

gcloud sql instances patch $InstanceName `
    --project $ProjectId `
    --database-flags $FlagsString

if ($LASTEXITCODE -eq 0) {
    Write-Host "Performance settings applied successfully." -ForegroundColor Green
}
else {
    Write-Host "Failed to apply performance settings." -ForegroundColor Red
    exit 1
}
