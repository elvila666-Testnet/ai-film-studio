Write-Host "Checking Deployment Prerequisites..." -ForegroundColor Cyan

# Check gcloud
if (Get-Command gcloud -ErrorAction SilentlyContinue) {
    Write-Host "[OK] gcloud CLI is installed." -ForegroundColor Green
    
    # Check auth
    $auth = gcloud auth list --filter=status:ACTIVE --format="value(account)"
    if ($auth) {
        Write-Host "[OK] Authenticated as: $auth" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Not authenticated. Run 'gcloud auth login'" -ForegroundColor Yellow
    }

    # Check project
    $project = gcloud config get-value project
    if ($project) {
        Write-Host "[OK] Project set to: $project" -ForegroundColor Green
    } else {
        Write-Host "[WARN] No project set. Run 'gcloud config set project <PROJECT_ID>'" -ForegroundColor Yellow
    }

} else {
    Write-Host "[MISSING] gcloud CLI not found." -ForegroundColor Red
    Write-Host "  -> Install from: https://cloud.google.com/sdk/docs/install"
}

# Check Docker
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "[OK] Docker is installed." -ForegroundColor Green
    
    # Check daemon
    docker info > $null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Docker daemon is running." -ForegroundColor Green
    } else {
        Write-Host "[WARN] Docker daemon is not running. Start Docker Desktop." -ForegroundColor Yellow
    }

} else {
    Write-Host "[MISSING] Docker not found." -ForegroundColor Red
    Write-Host "  -> Install from: https://docs.docker.com/get-docker/"
}

Write-Host "`nDone."
