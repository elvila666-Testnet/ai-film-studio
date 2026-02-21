$ErrorActionPreference = "Stop"

# Configuration
$ProjectId = "ai-films-prod-486422"
if ($env:GOOGLE_CLOUD_PROJECT) {
    $ProjectId = $env:GOOGLE_CLOUD_PROJECT
}

Write-Host "Setting up GitHub Actions Identity Federation for Project: $ProjectId" -ForegroundColor Yellow
Write-Host "This script creates the Service Account and Workload Identity Pool needed for GitHub Actions." -ForegroundColor Gray

# 1. Ask for GitHub Repository
$GitHubRepo = Read-Host "Enter your GitHub Repository (format: username/repo, e.g. elvila666/ai-film-studio)"
if (-not $GitHubRepo) {
    Write-Host "Error: Repository is required." -ForegroundColor Red
    exit 1
}

$ServiceAccountName = "github-actions-sa"
$ServiceAccountEmail = "$ServiceAccountName@$ProjectId.iam.gserviceaccount.com"
$PoolName = "github-pool"
$ProviderName = "github-provider"

# 2. Create Service Account
Write-Host "Creating Service Account: $ServiceAccountName..." -ForegroundColor Cyan
if (-not (gcloud iam service-accounts describe $ServiceAccountEmail --project $ProjectId 2>$null)) {
    gcloud iam service-accounts create $ServiceAccountName --display-name="GitHub Actions Service Account" --project $ProjectId
}
else {
    Write-Host "Service Account already exists." -ForegroundColor Green
}

# 3. Grant Roles
Write-Host "Granting IAM Roles..." -ForegroundColor Cyan
$Roles = @(
    "roles/run.admin",
    "roles/storage.admin",
    "roles/artifactregistry.admin",
    "roles/iam.serviceAccountUser",
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor" # Needed to access secrets during deploy verification if needed
)

foreach ($Role in $Roles) {
    gcloud projects add-iam-policy-binding $ProjectId `
        --member="serviceAccount:$ServiceAccountEmail" `
        --role=$Role `
        --condition=None `
        --quiet | Out-Null
}

# 4. Create Workload Identity Pool
Write-Host "Creating Workload Identity Pool: $PoolName..." -ForegroundColor Cyan
if (-not (gcloud iam workload-identity-pools describe $PoolName --location="global" --project $ProjectId 2>$null)) {
    gcloud iam workload-identity-pools create $PoolName `
        --project=$ProjectId `
        --location="global" `
        --display-name="GitHub Actions Pool"
}
else {
    Write-Host "Pool already exists." -ForegroundColor Green
}

# 5. Create Workload Identity Provider
Write-Host "Creating Workload Identity Provider: $ProviderName..." -ForegroundColor Cyan
if (-not (gcloud iam workload-identity-pools providers describe $ProviderName --workload-identity-pool=$PoolName --location="global" --project $ProjectId 2>$null)) {
    gcloud iam workload-identity-pools providers create-oidc $ProviderName `
        --project=$ProjectId `
        --location="global" `
        --workload-identity-pool=$PoolName `
        --display-name="GitHub Provider" `
        --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" `
        --issuer-uri="https://token.actions.githubusercontent.com"
}
else {
    Write-Host "Provider already exists." -ForegroundColor Green
}

# 6. Bind Repository to Service Account
Write-Host "Binding Repository $GitHubRepo to Service Account..." -ForegroundColor Cyan
# Get the full resource name of the pool
$PoolId = gcloud iam workload-identity-pools describe $PoolName --location="global" --project $ProjectId --format="value(name)"

# Allow the specific repository to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding $ServiceAccountEmail `
    --project=$ProjectId `
    --role="roles/iam.workloadIdentityUser" `
    --member="principalSet://iam.googleapis.com/${PoolId}/attribute.repository/${GitHubRepo}" `
    --quiet | Out-Null


# 7. Output Secrets
$ProviderId = gcloud iam workload-identity-pools providers describe $ProviderName --workload-identity-pool=$PoolName --location="global" --project $ProjectId --format="value(name)"

Write-Host ""
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================================="
Write-Host "Go to your GitHub Repository -> Settings -> Secrets -> Actions"
Write-Host "Add the following secrets:"
Write-Host ""
Write-Host "GCP_PROJECT_ID" -ForegroundColor Yellow
Write-Host $ProjectId
Write-Host ""
Write-Host "WIF_PROVIDER" -ForegroundColor Yellow
Write-Host $ProviderId
Write-Host ""
Write-Host "WIF_SERVICE_ACCOUNT" -ForegroundColor Yellow
Write-Host $ServiceAccountEmail
Write-Host "================================================="
