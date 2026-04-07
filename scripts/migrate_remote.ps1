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
# 2. Deploy Cloud Run Job
Write-Host "Found DB Connection: $connectionName"
Write-Host "Preparing Migration Job..."

gcloud run jobs deploy $jobName `
    --image=gcr.io/$ProjectId/ai-film-studio:latest `
    --region=us-central1 `
    --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=$ProjectId" `
    --set-secrets="DATABASE_URL=DATABASE_URL:latest" `
    --set-cloudsql-instances=$connectionName `
    --command="sh" `
    --args="-c" `
    --args="echo '[Job] Purging conflicting tables'; npx tsx scripts/reset-db.ts && echo '[Job] Running Schema Sync'; npm run db:push -- --force" `
    --quiet

# 3. Execute Job
Write-Host "Executing Migration Job..."
gcloud run jobs execute $jobName --region=us-central1 --wait

Write-Host "Migration Job Completed!" -ForegroundColor Green
