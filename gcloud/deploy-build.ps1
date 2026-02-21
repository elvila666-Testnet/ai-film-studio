# AI Film Studio - Google Cloud Deployment Script (Cloud Build)

$ErrorActionPreference = "Continue"

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
        $PROJECT_ID = Read-Host "Enter your Google Cloud Project ID"
    }
}

Write-Host "=== AI Film Studio Deployment (Cloud Build) ==="
Write-Host "Project ID: $PROJECT_ID"

# Get git commit info

$COMMIT_SHA = git rev-parse HEAD

# Submit build
Write-Host "INFO: Submitting Cloud Build job..."
gcloud builds submit --config gcloud/cloudbuild.yaml --project $PROJECT_ID --substitutions COMMIT_SHA=$COMMIT_SHA

Write-Host "INFO: Build submitted. Check Cloud Console for progress."
