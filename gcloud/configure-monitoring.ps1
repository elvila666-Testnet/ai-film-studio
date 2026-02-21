$ErrorActionPreference = "Stop"

# Configuration
$ProjectId = "ai-films-prod-486422"
$InstanceName = "ai-film-studio-db"

if ($env:GOOGLE_CLOUD_PROJECT) {
    $ProjectId = $env:GOOGLE_CLOUD_PROJECT
}

Write-Host "Configuring monitoring and insights for Cloud SQL instance: $InstanceName" -ForegroundColor Yellow

# Enable Query Insights
# This provides visual dashboard for query performance
Write-Host "Enabling Query Insights..." -ForegroundColor Cyan

gcloud sql instances patch $InstanceName `
    --project $ProjectId `
    --insights-config-query-insights-enabled `
    --insights-config-record-application-tags `
    --insights-config-record-client-address `
    --insights-config-query-string-length=1024

if ($LASTEXITCODE -eq 0) {
    Write-Host "Query Insights enabled successfully." -ForegroundColor Green
}
else {
    Write-Host "Failed to enable Query Insights." -ForegroundColor Red
    # Don't exit, try next steps
}

# Create a basic Alert Policy (if we had a notification channel)
# For now, we will just output instructions on how to set up the channel
Write-Host ""
Write-Host "By default, Cloud SQL metrics are sent to Cloud Monitoring."
Write-Host "To receive alerts (e.g. CPU > 80%), you must create a Notification Channel in the Google Cloud Console."
Write-Host "Visit: https://console.cloud.google.com/monitoring/alerting/notifications"
Write-Host ""
Write-Host "Once you have a channel, run:"
Write-Host "gcloud alpha monitoring policies create ..."
Write-Host "(See CLOUD_SQL_PRODUCTION.md for specific commands)"

