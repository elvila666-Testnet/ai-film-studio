$ErrorActionPreference = "Stop"

# Configuration
$ProjectId = "ai-films-prod-486422" # Default, or generic
$InstanceName = "ai-film-studio-db"

if ($env:GOOGLE_CLOUD_PROJECT) {
    $ProjectId = $env:GOOGLE_CLOUD_PROJECT
}

Write-Host "Configuring backups for Cloud SQL instance: $InstanceName in project $ProjectId" -ForegroundColor Yellow

# Verify instance exists
$Instance = gcloud sql instances describe $InstanceName --project $ProjectId --format="json" 2>$null | ConvertFrom-Json

if (-not $Instance) {
    Write-Host "Error: Instance $InstanceName not found." -ForegroundColor Red
    exit 1
}

# Update backup configuration
# - Start time 02:00 UTC (low traffic)
# - Retention: 30 days
# - Point-in-time recovery (binary logs): Enabled (already enabled in setup, but reinforcing)
# - Location: Multi-region (implied by default or handled at creation, but here we set retention)

Write-Host "Updating backup configuration..." -ForegroundColor Cyan

gcloud sql instances patch $InstanceName `
    --project $ProjectId `
    --backup-start-time "02:00" `
    --retained-backups-count 30 `
    --retained-transaction-log-days 7 `
    --enable-bin-log

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup configuration updated successfully." -ForegroundColor Green
    Write-Host " - Backup start time: 02:00 UTC"
    Write-Host " - Retention: 30 backups"
    Write-Host " - Point-in-time recovery: 7 days"
}
else {
    Write-Host "Failed to update backup configuration." -ForegroundColor Red
    exit 1
}
