param(
    [string]$ProjectId = "ai-films-prod-486422",
    [string]$Region = "us-central1",
    [string]$ServiceName = "ai-film-studio"
)

# Helper to ensure we are in root
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
gcloud services enable secretmanager.googleapis.com

# Check for required secrets
Write-Host ""
Write-Host "Checking for required secrets..." -ForegroundColor Yellow
$RequiredSecrets = @(
    "DATABASE_URL",
    "JWT_SECRET",
    "REPLICATE_API_KEY",
    "BUILT_IN_FORGE_API_URL",
    "BUILT_IN_FORGE_API_KEY"
)

$MissingSecrets = @()
foreach ($secret in $RequiredSecrets) {
    $exists = gcloud secrets describe $secret 2>$null
    if ($LASTEXITCODE -ne 0) {
        $MissingSecrets += $secret
    }
    else {
        Write-Host "  ✓ $secret" -ForegroundColor Green
    }
}

if ($MissingSecrets.Count -gt 0) {
    Write-Host ""
    Write-Host "ERROR: Missing required secrets:" -ForegroundColor Red
    foreach ($secret in $MissingSecrets) {
        Write-Host "  ✗ $secret" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please create these secrets first. See .gemini/DEPLOYMENT_GUIDE.md for instructions." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Quick create commands:" -ForegroundColor Cyan
    foreach ($secret in $MissingSecrets) {
        Write-Host "  gcloud secrets create $secret --data-file=- <<< 'your-value-here'" -ForegroundColor White
    }
    exit 1
}

Write-Host "All required secrets found!" -ForegroundColor Green

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
    --memory 1Gi `
    --cpu 2 `
    --min-instances 0 `
    --max-instances 10 `
    --timeout 300 `
    --update-env-vars "NODE_ENV=production" `
    --update-secrets "DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,REPLICATE_API_KEY=REPLICATE_API_KEY:latest,BUILT_IN_FORGE_API_URL=BUILT_IN_FORGE_API_URL:latest,BUILT_IN_FORGE_API_KEY=BUILT_IN_FORGE_API_KEY:latest"

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
Write-Host "Testing health endpoint..." -ForegroundColor Yellow
$HealthResponse = curl -s "$ServiceUrl/api/health"
Write-Host $HealthResponse -ForegroundColor White
Write-Host ""
Write-Host "Default Login:" -ForegroundColor Yellow
Write-Host "  Email: admin@filmstudio.ai" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Test the application at: $ServiceUrl" -ForegroundColor White
Write-Host "  2. Create a brand and test Brand Archetypes generation" -ForegroundColor White
Write-Host "  3. Configure custom domain (optional)" -ForegroundColor White
Write-Host "  4. Set up monitoring and alerts" -ForegroundColor White
Write-Host ""
