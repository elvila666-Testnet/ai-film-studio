#!/bin/bash

# AI Film Studio - Google Cloud Deployment Script
# This script automates the deployment process to Google Cloud Run

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${1:-ai-film-studio}"
REGION="${2:-us-central1}"
SERVICE_NAME="ai-film-studio"
DB_INSTANCE="ai-film-studio-db"
STORAGE_BUCKET="ai-film-studio-media"

echo -e "${YELLOW}=== AI Film Studio Deployment Script ===${NC}"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check prerequisites
print_info "Checking prerequisites..."

if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI not found. Please install it from https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    print_error "Docker not found. Please install it from https://docs.docker.com/get-docker/"
    exit 1
fi

print_status "Prerequisites check passed"

# Set project
print_info "Setting Google Cloud project..."
gcloud config set project $PROJECT_ID
print_status "Project set to $PROJECT_ID"

# Enable APIs
print_info "Enabling required Google Cloud APIs..."
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage-api.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com
print_status "APIs enabled"

# Create service account
print_info "Creating service account..."
if ! gcloud iam service-accounts describe ${SERVICE_NAME}-sa@${PROJECT_ID}.iam.gserviceaccount.com &> /dev/null; then
    gcloud iam service-accounts create ${SERVICE_NAME}-sa \
        --display-name="AI Film Studio Service Account"
    print_status "Service account created"
else
    print_status "Service account already exists"
fi

# Grant roles
print_info "Granting IAM roles..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_NAME}-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client" \
    --quiet 2>/dev/null || true

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_NAME}-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/storage.admin" \
    --quiet 2>/dev/null || true

print_status "IAM roles granted"

# Create Cloud SQL instance
print_info "Checking Cloud SQL instance..."
if ! gcloud sql instances describe $DB_INSTANCE --region=$REGION &> /dev/null; then
    print_info "Creating Cloud SQL instance (this may take 2-3 minutes)..."
    gcloud sql instances create $DB_INSTANCE \
        --database-version=MYSQL_8_0 \
        --tier=db-f1-micro \
        --region=$REGION \
        --availability-type=zonal \
        --backup-start-time=03:00 \
        --enable-bin-log
    print_status "Cloud SQL instance created"
else
    print_status "Cloud SQL instance already exists"
fi

# Create database
print_info "Creating database..."
gcloud sql databases create ai_film_studio \
    --instance=$DB_INSTANCE \
    --charset=utf8mb4 \
    --collation=utf8mb4_unicode_ci 2>/dev/null || print_status "Database already exists"

# Create database user
print_info "Creating database user..."
read -sp "Enter database password: " DB_PASSWORD
echo ""
gcloud sql users create filmstudio \
    --instance=$DB_INSTANCE \
    --password=$DB_PASSWORD 2>/dev/null || print_status "Database user already exists"

# Create storage bucket
print_info "Creating Cloud Storage bucket..."
if ! gsutil ls gs://$STORAGE_BUCKET &> /dev/null; then
    gsutil mb -l $REGION gs://$STORAGE_BUCKET
    print_status "Storage bucket created"
else
    print_status "Storage bucket already exists"
fi

# Get Cloud SQL connection string
print_info "Getting Cloud SQL connection string..."
DB_CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE --format='value(connectionName)')
DATABASE_URL="mysql://filmstudio:${DB_PASSWORD}@/ai_film_studio?unix_socket=/cloudsql/${DB_CONNECTION_NAME}"

# Create secrets
print_info "Creating secrets in Secret Manager..."
echo -n "$DATABASE_URL" | gcloud secrets create DATABASE_URL --data-file=- 2>/dev/null || \
    gcloud secrets versions add DATABASE_URL --data-file=- <<< "$DATABASE_URL"

# Prompt for API keys
print_info "Please provide your API keys (or press Enter to skip):"

read -p "Gemini API Key: " GEMINI_KEY
if [ ! -z "$GEMINI_KEY" ]; then
    echo -n "$GEMINI_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=- 2>/dev/null || \
        gcloud secrets versions add GEMINI_API_KEY --data-file=- <<< "$GEMINI_KEY"
fi

read -p "Nanobanana API Key: " NANOBANANA_KEY
if [ ! -z "$NANOBANANA_KEY" ]; then
    echo -n "$NANOBANANA_KEY" | gcloud secrets create NANOBANANA_API_KEY --data-file=- 2>/dev/null || \
        gcloud secrets versions add NANOBANANA_API_KEY --data-file=- <<< "$NANOBANANA_KEY"
fi

read -p "Sora API Key: " SORA_KEY
if [ ! -z "$SORA_KEY" ]; then
    echo -n "$SORA_KEY" | gcloud secrets create SORA_API_KEY --data-file=- 2>/dev/null || \
        gcloud secrets versions add SORA_API_KEY --data-file=- <<< "$SORA_KEY"
fi

read -p "Veo3 API Key: " VEO3_KEY
if [ ! -z "$VEO3_KEY" ]; then
    echo -n "$VEO3_KEY" | gcloud secrets create VEO3_API_KEY --data-file=- 2>/dev/null || \
        gcloud secrets versions add VEO3_API_KEY --data-file=- <<< "$VEO3_KEY"
fi

read -p "OpenAI API Key: " OPENAI_KEY
if [ ! -z "$OPENAI_KEY" ]; then
    echo -n "$OPENAI_KEY" | gcloud secrets create OPENAI_API_KEY --data-file=- 2>/dev/null || \
        gcloud secrets versions add OPENAI_API_KEY --data-file=- <<< "$OPENAI_KEY"
fi

read -p "JWT Secret: " JWT_SECRET
if [ ! -z "$JWT_SECRET" ]; then
    echo -n "$JWT_SECRET" | gcloud secrets create JWT_SECRET --data-file=- 2>/dev/null || \
        gcloud secrets versions add JWT_SECRET --data-file=- <<< "$JWT_SECRET"
fi

print_status "Secrets created"

# Build and deploy
print_info "Building Docker image and deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --source . \
    --platform managed \
    --region $REGION \
    --memory 2Gi \
    --cpu 2 \
    --timeout 3600 \
    --allow-unauthenticated \
    --set-cloudsql-instances ${PROJECT_ID}:${REGION}:${DB_INSTANCE} \
    --service-account ${SERVICE_NAME}-sa@${PROJECT_ID}.iam.gserviceaccount.com

print_status "Deployment complete!"

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')
print_info "Service URL: $SERVICE_URL"

echo ""
echo -e "${GREEN}=== Deployment Summary ===${NC}"
echo "Project ID: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo "URL: $SERVICE_URL"
echo "Database: $DB_INSTANCE"
echo "Storage Bucket: gs://$STORAGE_BUCKET"
echo ""
echo "Next steps:"
echo "1. Visit $SERVICE_URL to access your application"
echo "2. Configure your domain in Cloud Run settings"
echo "3. Set up monitoring in Cloud Console"
echo "4. Review logs: gcloud logging read --limit 50"
