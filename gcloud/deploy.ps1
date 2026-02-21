param(
    [string]$ProjectId = "ai-films-prod-486422",
    [string]$Region = "us-central1",
    [string]$ServiceName = "ai-film-studio"
)

# helper to ensure we are in root
$ScriptPath = $MyInvocation.MyCommand.Path
$ScriptDir = Split-Path $ScriptPath
$ProjectRoot = Split-Path $ScriptDir -Parent
Set-Location $ProjectRoot
Write-Host "Working in project root: $ProjectRoot" -ForegroundColor Gray

Write-Host "AI Film Studio - Cloud Run Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "Error: gcloud CLI is not installed" -ForegroundColor Red
    Write-Host "Please install it from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Set the project
Write-Host "Setting project to: $ProjectId" -ForegroundColor Yellow
gcloud config set project $ProjectId

# Enable required APIs
Write-Host ""
Write-Host "Enabling required Google Cloud APIs..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com

# Build the application locally first
Write-Host ""
Write-Host "Building application locally..." -ForegroundColor Yellow
pnpm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green

# Build and push Docker image using Cloud Build
Write-Host ""
Write-Host "Building Docker image with Cloud Build..." -ForegroundColor Yellow
$ImageName = "gcr.io/$ProjectId/$ServiceName"

# Use --tag directly (simpler, ignores cloudbuild.yaml but works for manual deploy)
# We don't use cloudbuild.yaml here because it duplicates the deploy step
gcloud builds submit --tag $ImageName

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Docker image built successfully!" -ForegroundColor Green

# Deploy to Cloud Run
Write-Host ""
Write-Host "Deploying to Cloud Run..." -ForegroundColor Yellow

gcloud run deploy $ServiceName `
    --image $ImageName `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --port 8080 `
    --memory 512Mi `
    --cpu 1 `
    --min-instances 0 `
    --max-instances 10 `
    --timeout 300 `
    --update-env-vars "NODE_ENV=production" `
    --update-secrets "REPLICATE_API_KEY=REPLICATE_API_KEY:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

# Get the service URL
Write-Host ""
Write-Host "Deployment successful!" -ForegroundColor Green
Write-Host ""

$ServiceUrl = gcloud run services describe $ServiceName --region $Region --format 'value(status.url)'

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URL: $ServiceUrl" -ForegroundColor Cyan
Write-Host "Health Check: $ServiceUrl/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Default Login:" -ForegroundColor Yellow
Write-Host "  Email: admin@filmstudio.ai" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
