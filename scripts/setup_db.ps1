# Automate Cloud SQL Setup for AI Film Studio
param(
    [string]$ProjectId = $(gcloud config get-value project)
)

if (-not $ProjectId) {
    Write-Error "Project ID not set. Run 'gcloud config set project <PROJECT_ID>' first."
    exit 1
}

Write-Host "Setting up Database for Project: $ProjectId" -ForegroundColor Cyan

# 1. Enable Cloud SQL Admin API
Write-Host "Enabling Cloud SQL Admin API..."
gcloud services enable sqladmin.googleapis.com

# 2. Check/Create Instance
$instanceName = "ai-film-studio-db"
$instanceCheck = gcloud sql instances list --format="value(name)" --filter="name:$instanceName"
if (-not $instanceCheck) {
    Write-Host "Creating Cloud SQL Instance ($instanceName)... This may take 5-10 minutes."
    gcloud sql instances create $instanceName `
        --database-version=MYSQL_8_0 `
        --tier=db-f1-micro `
        --region=us-central1 `
        --availability-type=zonal `
        --root-password=root_password_change_me `
        --quiet
}
else {
    Write-Host "Instance ($instanceName) already exists." -ForegroundColor Green
}

# 3. Check/Create Database
$dbName = "ai_film_studio"
$dbCheck = gcloud sql databases list --instance=$instanceName --format="value(name)" --filter="name:$dbName"
if (-not $dbCheck) {
    Write-Host "Creating Database ($dbName)..."
    gcloud sql databases create $dbName --instance=$instanceName --quiet
}
else {
    Write-Host "Database ($dbName) already exists." -ForegroundColor Green
}

# 4. Check/Create User
$userName = "filmstudio"
$userCheck = gcloud sql users list --instance=$instanceName --format="value(name)" --filter="name:$userName"
$dbPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | % { [char]$_ })

if (-not $userCheck) {
    Write-Host "Creating Database User ($userName)..."
    gcloud sql users create $userName --instance=$instanceName --password=$dbPassword --token-format=password --quiet
    Write-Host "Database Password: $dbPassword" -ForegroundColor Yellow
}
else {
    Write-Host "User ($userName) already exists. Resetting password..."
    gcloud sql users set-password $userName --instance=$instanceName --password=$dbPassword --quiet
    Write-Host "New Database Password: $dbPassword" -ForegroundColor Yellow
}

# 5. Authorize Current IP (for migrations)
try {
    $myIp = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content.Trim()
    Write-Host "Authorizing your IP ($myIp)..."
    gcloud sql instances patch $instanceName --authorized-networks=$myIp --quiet
}
catch {
    Write-Host "Could not automatically authorize IP. You may need to whitelist manually." -ForegroundColor Red
}

# 6. Get Connection Info
$connectionName = gcloud sql instances describe $instanceName --format="value(connectionName)"
$publicIp = gcloud sql instances describe $instanceName --format="value(ipAddresses[0].ipAddress)"

# 7. Update Cloud Run
Write-Host "Connecting Cloud Run to Database..."
# Cloud Run uses Unix socket for connection
$cloudRunUrl = "mysql://${userName}:${dbPassword}@localhost/${dbName}?socketPath=/cloudsql/$connectionName"
# Local connection uses Public IP (TCP)
$localUrl = "mysql://${userName}:${dbPassword}@${publicIp}:3306/${dbName}"

gcloud run services update ai-film-studio `
    --region=us-central1 `
    --add-cloudsql-instances=$connectionName `
    --set-env-vars="DATABASE_URL=$cloudRunUrl" `
    --quiet

Write-Host "`nDatabase Setup Complete!" -ForegroundColor Green
Write-Host "Run the following command to initialize the database schema:" -ForegroundColor Cyan
Write-Host "`$env:DATABASE_URL='$localUrl'; npm run db:push" -ForegroundColor White
