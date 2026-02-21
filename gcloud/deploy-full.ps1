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

Write-Host "AI Film Studio - FULL REBUILD & DEPLOY" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 1. Build Local
Write-Host "1. Building application locally..." -ForegroundColor Yellow
pnpm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# 2. Build Docker
Write-Host "2. Building Docker image..." -ForegroundColor Yellow
$ImageName = "gcr.io/$ProjectId/$ServiceName"
gcloud builds submit --tag $ImageName
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed!" -ForegroundColor Red
    exit 1
}

# 3. Deploy with OpenAI Key & NanoBanana Key
Write-Host "3. Deploying to Cloud Run (Including API Keys)..." -ForegroundColor Yellow

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
    --update-secrets "DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,REPLICATE_API_KEY=REPLICATE_API_KEY:latest,BUILT_IN_FORGE_API_URL=BUILT_IN_FORGE_API_URL:latest,BUILT_IN_FORGE_API_KEY=BUILT_IN_FORGE_API_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deployment Successful!" -ForegroundColor Green
$ServiceUrl = gcloud run services describe $ServiceName --region $Region --format 'value(status.url)'
Write-Host "URL: $ServiceUrl" -ForegroundColor Cyan
