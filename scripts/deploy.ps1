# Deploy to Google Cloud Run
param(
    [string]$ProjectId = $(gcloud config get-value project)
)

if (-not $ProjectId) {
    Write-Error "Project ID not set. Run 'gcloud config set project <PROJECT_ID>' first."
    exit 1
}

Write-Host "Deploying to Project: $ProjectId" -ForegroundColor Cyan

# Submit build to Cloud Build
Write-Host "Submitting build..."
gcloud builds submit --config=cloudbuild.yaml .

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment successful!" -ForegroundColor Green
    Write-Host "Check the URL in the output above."
} else {
    Write-Host "Deployment failed." -ForegroundColor Red
}
