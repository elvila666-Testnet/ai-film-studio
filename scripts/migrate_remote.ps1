# Run Database Migration Remotely via Cloud Run Job
param(
    [string]$ProjectId = $(gcloud config get-value project)
)

if (-not $ProjectId) {
    Write-Error "Project ID not set. Run 'gcloud config set project <PROJECT_ID>' first."
    exit 1
}

Write-Host "Setting up Remote Migration for Project: $ProjectId" -ForegroundColor Cyan

$serviceName = "ai-film-studio"
$jobName = "ai-film-studio-migrate"

# 1. Get Connection Name from Service
Write-Host "Fetching configuration from Cloud Run Service..."
$connectionName = gcloud run services describe $serviceName --region=us-central1 --format="value(spec.template.metadata.annotations['run.googleapis.com/cloudsql-instances'])"
# Parse specific env var directly
$serviceJson = gcloud run services describe $serviceName --region=us-central1 --format="json" | ConvertFrom-Json
$dbUrl = ($serviceJson.spec.template.spec.containers[0].env | Where-Object { $_.name -eq "DATABASE_URL" }).value

if (-not $dbUrl) {
    Write-Error "Could not find DATABASE_URL in Cloud Run service configuration."
    exit 1
}

Write-Host "Found DB Connection: $connectionName"
Write-Host "Preparing Migration Job..."

# 2. Deploy Cloud Run Job
# We run manual_migrate first (foolproof fallback for login) then drizzle-kit (for full schema)
gcloud run jobs deploy $jobName `
    --image=gcr.io/$ProjectId/ai-film-studio:latest `
    --region=us-central1 `
    --set-env-vars="DATABASE_URL=$dbUrl" `
    --set-cloudsql-instances=$connectionName `
    --command="sh" `
    --args="-c" `
    --args="echo '[Job] Starting Forced Schema Sync'; pnpm db:push --force" `
    --quiet

# 3. Execute Job
Write-Host "Executing Migration Job..."
gcloud run jobs execute $jobName --region=us-central1 --wait

Write-Host "Migration Job Completed!" -ForegroundColor Green
