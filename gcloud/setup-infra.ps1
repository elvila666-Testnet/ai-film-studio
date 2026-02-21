# AI Film Studio - Google Cloud Deployment Script (PowerShell)
# This script automates the deployment process to Google Cloud Run

$ErrorActionPreference = "Stop"

# Configuration
$ScriptPath = $MyInvocation.MyCommand.Path
$ScriptDir = Split-Path $ScriptPath
$ProjectRoot = Split-Path $ScriptDir -Parent
Set-Location $ProjectRoot

$PROJECT_ID = $args[0]
if (-not $PROJECT_ID) {
    if ($env:GOOGLE_CLOUD_PROJECT) {
        $PROJECT_ID = $env:GOOGLE_CLOUD_PROJECT
    }
    else {
        $PROJECT_ID = Read-Host "Enter your Google Cloud Project ID (must be globally unique)"
    }
}

$REGION = "us-central1"
$SERVICE_NAME = "ai-film-studio"
$DB_INSTANCE = "ai-film-studio-db"
$STORAGE_BUCKET = "ai-film-studio-media"

Write-Host "=== AI Film Studio Deployment Script ===" -ForegroundColor Yellow
Write-Host "Project ID: $PROJECT_ID"
Write-Host "Region: $REGION"
Write-Host ""

function Print-Status($message) {
    Write-Host "[OK] $message" -ForegroundColor Green
}

function Print-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

function Print-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Yellow
}

# Check prerequisites
Print-Info "Checking prerequisites..."

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Print-Error "gcloud CLI not found. Please install it from https://cloud.google.com/sdk/docs/install"
    exit 1
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Print-Error "Docker not found. Please install it from https://docs.docker.com/get-docker/"
    exit 1
}

Print-Status "Prerequisites check passed"

# Set project
Print-Info "Setting Google Cloud project..."
gcloud config set project $PROJECT_ID
if ($LASTEXITCODE -ne 0) {
    Print-Error "Failed to set project. Ensure the project exists."
    exit 1
}
Print-Status "Project set to $PROJECT_ID"

# Enable APIs
Print-Info "Enabling required Google Cloud APIs..."
gcloud services enable run.googleapis.com sqladmin.googleapis.com storage-api.googleapis.com cloudbuild.googleapis.com logging.googleapis.com monitoring.googleapis.com secretmanager.googleapis.com
Print-Status "APIs enabled"

# Get default compute service account
Print-Info "Getting project number..."
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$saEmail = "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
Print-Status "Using default compute service account: $saEmail"

# Grant roles
# Print-Info "Granting IAM roles..."
# $roles = @("roles/cloudsql.client", "roles/storage.admin", "roles/secretmanager.secretAccessor")
# foreach ($role in $roles) {
#     gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$saEmail" --role="$role" --quiet 2>$null | Out-Null
# }
# Print-Status "IAM roles granted (skipped)"

# Create Cloud SQL instance
Print-Info "Checking Cloud SQL instance..."
$instanceExists = gcloud sql instances describe $DB_INSTANCE --region=$REGION 2>$null
if (-not $instanceExists) {
    Print-Info "Creating Cloud SQL instance (this may take 5-10 minutes)..."
    gcloud sql instances create $DB_INSTANCE --database-version=MYSQL_8_0 --tier=db-f1-micro --region=$REGION --availability-type=zonal --backup-start-time=03:00 --enable-bin-log
    Print-Status "Cloud SQL instance created"
}
else {
    Print-Status "Cloud SQL instance already exists"
}

# Create database
Print-Info "Creating database..."
gcloud sql databases create ai_film_studio --instance=$DB_INSTANCE --charset=utf8mb4 --collation=utf8mb4_unicode_ci 2>$null
Print-Status "Database ensured"

# Create database user
Print-Info "Creating database user..."
if ($env:DB_PASSWORD) {
    $DB_PASSWORD_PLAIN = $env:DB_PASSWORD
    Write-Host "Using database password from environment variable."
}
else {
    $DB_PASSWORD = Read-Host -AsSecureString "Enter database password for user filmstudio"
    $DB_PASSWORD_PLAIN = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))
}

gcloud sql users create filmstudio --instance=$DB_INSTANCE --password=$DB_PASSWORD_PLAIN 2>$null
if ($LASTEXITCODE -ne 0) {
    # Try updating password if user exists
    gcloud sql users set-password filmstudio --instance=$DB_INSTANCE --password=$DB_PASSWORD_PLAIN 2>$null
}
Print-Status "Database user ensured"

# Create storage bucket
Print-Info "Creating Cloud Storage bucket..."
$bucketExists = gsutil ls gs://$STORAGE_BUCKET 2>$null
if (-not $bucketExists) {
    gsutil mb -l $REGION gs://$STORAGE_BUCKET
    Print-Status "Storage bucket created"
}
else {
    Print-Status "Storage bucket already exists"
}

# Get Cloud SQL connection string
Print-Info "Getting Cloud SQL connection string..."
$DB_CONNECTION_NAME = gcloud sql instances describe $DB_INSTANCE --format="value(connectionName)"
$DATABASE_URL = "mysql://filmstudio:${DB_PASSWORD_PLAIN}@/ai_film_studio?unix_socket=/cloudsql/${DB_CONNECTION_NAME}"

# Create secrets
Print-Info "Creating secrets in Secret Manager..."

function Create-Secret($name, $value) {
    if (-not $value) { return }
    $secretExists = gcloud secrets describe $name 2>$null
    if (-not $secretExists) {
        echo $value | gcloud secrets create $name --data-file=-
    }
    else {
        echo $value | gcloud secrets versions add $name --data-file=-
    }
}

Create-Secret "DATABASE_URL" $DATABASE_URL

Print-Info "Please provide your API keys (or press Enter to skip):"

if ($env:SKIP_API_KEYS -eq "true") {
    Write-Host "Skipping API keys as requested..."
}
else {
    $GEMINI_KEY = Read-Host "Gemini API Key"
    Create-Secret "GEMINI_API_KEY" $GEMINI_KEY

    $NANOBANANA_KEY = Read-Host "Nanobanana API Key"
    Create-Secret "NANOBANANA_API_KEY" $NANOBANANA_KEY

    $SORA_KEY = Read-Host "Sora API Key"
    Create-Secret "SORA_API_KEY" $SORA_KEY

    $VEO3_KEY = Read-Host "Veo3 API Key"
    Create-Secret "VEO3_API_KEY" $VEO3_KEY

    $OPENAI_KEY = Read-Host "OpenAI API Key"
    Create-Secret "OPENAI_API_KEY" $OPENAI_KEY

    $JWT_SECRET = Read-Host "JWT Secret"
    Create-Secret "JWT_SECRET" $JWT_SECRET

    $REDIS_HOST = Read-Host "Redis Host (IP)"
    Create-Secret "REDIS_HOST" $REDIS_HOST

    $REDIS_PORT = Read-Host "Redis Port (Default: 6379)"
    if (-not $REDIS_PORT) { $REDIS_PORT = "6379" }
    Create-Secret "REDIS_PORT" $REDIS_PORT
}

Print-Status "Secrets created"

# Build and deploy
Print-Info "Building Docker image and deploying to Cloud Run..."
# Construct environment variables string
$envVars = "DATABASE_URL=projects/$PROJECT_ID/secrets/DATABASE_URL/versions/latest"
if ($GEMINI_KEY) { $envVars += ",GEMINI_API_KEY=projects/$PROJECT_ID/secrets/GEMINI_API_KEY/versions/latest" }
if ($NANOBANANA_KEY) { $envVars += ",NANOBANANA_API_KEY=projects/$PROJECT_ID/secrets/NANOBANANA_API_KEY/versions/latest" }
if ($SORA_KEY) { $envVars += ",SORA_API_KEY=projects/$PROJECT_ID/secrets/SORA_API_KEY/versions/latest" }
if ($VEO3_KEY) { $envVars += ",VEO3_API_KEY=projects/$PROJECT_ID/secrets/VEO3_API_KEY/versions/latest" }
if ($OPENAI_KEY) { $envVars += ",OPENAI_API_KEY=projects/$PROJECT_ID/secrets/OPENAI_API_KEY/versions/latest" }
if ($JWT_SECRET) { $envVars += ",JWT_SECRET=projects/$PROJECT_ID/secrets/JWT_SECRET/versions/latest" }
if ($REDIS_HOST) { $envVars += ",REDIS_HOST=projects/$PROJECT_ID/secrets/REDIS_HOST/versions/latest" }
if ($REDIS_PORT) { $envVars += ",REDIS_PORT=projects/$PROJECT_ID/secrets/REDIS_PORT/versions/latest" }

gcloud run deploy $SERVICE_NAME --source . --platform managed --region $REGION --memory 2Gi --cpu 2 --timeout 3600 --allow-unauthenticated --set-cloudsql-instances "${PROJECT_ID}:${REGION}:${DB_INSTANCE}" --set-secrets "$envVars"

Print-Status "Deployment complete!"

# Get service URL
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)"
Print-Info "Service URL: $SERVICE_URL"

Print-Info "Next steps:"
Print-Info "1. Visit $SERVICE_URL to access your application"
Print-Info "2. Review logs: gcloud logging read --limit 50"
