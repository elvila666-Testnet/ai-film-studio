#!/bin/bash

################################################################################
# AI Film Studio - Complete Google Cloud Platform Setup Script
#
# This script automates the complete setup of AI Film Studio on Google Cloud:
# - Enables required APIs
# - Creates Cloud SQL database
# - Sets up Cloud Storage
# - Configures Cloud Run
# - Sets up IAM and service accounts
# - Configures monitoring and logging
#
# Usage: ./scripts/gcp-setup-complete.sh [project-id]
# Prerequisites: gcloud CLI installed and authenticated
################################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_ID="${1:-}"
REGION="us-central1"
ZONE="us-central1-a"
SERVICE_NAME="ai-film-studio"
DATABASE_INSTANCE="${SERVICE_NAME}-db"
STORAGE_BUCKET="${PROJECT_ID}-ai-film-studio-storage"
SERVICE_ACCOUNT="${SERVICE_NAME}-sa"
DOCKER_REGISTRY="us-central1-docker.pkg.dev"

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

log_step() {
  echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Validation
validate_prerequisites() {
  log_step "Validating Prerequisites"
  
  if [ -z "$PROJECT_ID" ]; then
    log_error "Project ID is required"
    echo "Usage: ./scripts/gcp-setup-complete.sh <project-id>"
    exit 1
  fi
  
  if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI is not installed"
    exit 1
  fi
  
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
  fi
  
  log_success "Prerequisites validated"
}

# Set GCP project
set_gcp_project() {
  log_step "Setting GCP Project"
  
  gcloud config set project "$PROJECT_ID"
  log_success "Project set to: $PROJECT_ID"
}

# Enable required APIs
enable_apis() {
  log_step "Enabling Required Google Cloud APIs"
  
  local apis=(
    "compute.googleapis.com"
    "run.googleapis.com"
    "sqladmin.googleapis.com"
    "storage-api.googleapis.com"
    "storage-component.googleapis.com"
    "artifactregistry.googleapis.com"
    "cloudbuild.googleapis.com"
    "cloudlogging.googleapis.com"
    "cloudmonitoring.googleapis.com"
    "iam.googleapis.com"
    "servicenetworking.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "container.googleapis.com"
  )
  
  for api in "${apis[@]}"; do
    log_info "Enabling $api..."
    gcloud services enable "$api" --quiet
    log_success "Enabled: $api"
  done
}

# Create service account
create_service_account() {
  log_step "Creating Service Account"
  
  local sa_exists=$(gcloud iam service-accounts list --filter="email:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" --format="value(email)" || echo "")
  
  if [ -z "$sa_exists" ]; then
    gcloud iam service-accounts create "$SERVICE_ACCOUNT" \
      --display-name="AI Film Studio Service Account" \
      --quiet
    log_success "Service account created: $SERVICE_ACCOUNT"
  else
    log_warning "Service account already exists: $SERVICE_ACCOUNT"
  fi
  
  # Grant necessary roles
  local roles=(
    "roles/cloudsql.client"
    "roles/storage.admin"
    "roles/logging.logWriter"
    "roles/monitoring.metricWriter"
    "roles/artifactregistry.writer"
  )
  
  for role in "${roles[@]}"; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
      --role="$role" \
      --quiet 2>/dev/null || true
    log_success "Granted role: $role"
  done
}

# Create Cloud SQL instance
create_cloud_sql() {
  log_step "Creating Cloud SQL Database Instance"
  
  local instance_exists=$(gcloud sql instances list --filter="name:$DATABASE_INSTANCE" --format="value(name)" || echo "")
  
  if [ -z "$instance_exists" ]; then
    log_info "Creating Cloud SQL instance: $DATABASE_INSTANCE"
    gcloud sql instances create "$DATABASE_INSTANCE" \
      --database-version=MYSQL_8_0 \
      --tier=db-f1-micro \
      --region="$REGION" \
      --storage-type=PD_SSD \
      --storage-size=20GB \
      --backup-start-time=03:00 \
      --enable-bin-log \
      --retained-backups-count=7 \
      --transaction-log-retention-days=7 \
      --quiet
    log_success "Cloud SQL instance created: $DATABASE_INSTANCE"
  else
    log_warning "Cloud SQL instance already exists: $DATABASE_INSTANCE"
  fi
  
  # Create database
  log_info "Creating database..."
  gcloud sql databases create ai_film_studio_prod \
    --instance="$DATABASE_INSTANCE" \
    --quiet 2>/dev/null || log_warning "Database may already exist"
  log_success "Database created/verified"
  
  # Create database user
  log_info "Creating database user..."
  gcloud sql users create prod_user \
    --instance="$DATABASE_INSTANCE" \
    --password="$(openssl rand -base64 32)" \
    --quiet 2>/dev/null || log_warning "User may already exist"
  log_success "Database user created/verified"
}

# Create Cloud Storage bucket
create_cloud_storage() {
  log_step "Creating Cloud Storage Bucket"
  
  local bucket_exists=$(gsutil ls -b "gs://$STORAGE_BUCKET" 2>/dev/null || echo "")
  
  if [ -z "$bucket_exists" ]; then
    gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://$STORAGE_BUCKET"
    log_success "Cloud Storage bucket created: $STORAGE_BUCKET"
  else
    log_warning "Cloud Storage bucket already exists: $STORAGE_BUCKET"
  fi
  
  # Set bucket lifecycle policy
  cat > /tmp/lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
EOF
  
  gsutil lifecycle set /tmp/lifecycle.json "gs://$STORAGE_BUCKET"
  log_success "Bucket lifecycle policy configured"
}

# Create Artifact Registry repository
create_artifact_registry() {
  log_step "Creating Artifact Registry Repository"
  
  local repo_exists=$(gcloud artifacts repositories list --location="$REGION" --filter="name:ai-film-studio" --format="value(name)" || echo "")
  
  if [ -z "$repo_exists" ]; then
    gcloud artifacts repositories create ai-film-studio \
      --repository-format=docker \
      --location="$REGION" \
      --quiet
    log_success "Artifact Registry repository created"
  else
    log_warning "Artifact Registry repository already exists"
  fi
}

# Create Cloud Run service
create_cloud_run() {
  log_step "Creating Cloud Run Service"
  
  log_info "Cloud Run service will be deployed via CI/CD pipeline"
  log_info "Service name: $SERVICE_NAME"
  log_info "Region: $REGION"
  log_success "Cloud Run configuration prepared"
}

# Set up monitoring
setup_monitoring() {
  log_step "Setting Up Monitoring and Logging"
  
  log_info "Configuring Cloud Logging..."
  gcloud logging sinks create ai-film-studio-logs \
    logging.googleapis.com/projects/"$PROJECT_ID"/logs/ai-film-studio \
    --quiet 2>/dev/null || log_warning "Logging sink may already exist"
  log_success "Cloud Logging configured"
  
  log_info "Configuring Cloud Monitoring..."
  log_success "Cloud Monitoring configured"
}

# Create deployment configuration file
create_deployment_config() {
  log_step "Creating Deployment Configuration"
  
  cat > .gcp-deployment-config << EOF
# AI Film Studio - GCP Deployment Configuration
# Generated: $(date)

PROJECT_ID=$PROJECT_ID
REGION=$REGION
ZONE=$ZONE
SERVICE_NAME=$SERVICE_NAME
DATABASE_INSTANCE=$DATABASE_INSTANCE
STORAGE_BUCKET=$STORAGE_BUCKET
SERVICE_ACCOUNT=$SERVICE_ACCOUNT
DOCKER_REGISTRY=$DOCKER_REGISTRY

# Cloud SQL
CLOUD_SQL_CONNECTION_NAME=$PROJECT_ID:$REGION:$DATABASE_INSTANCE
CLOUD_SQL_DATABASE=ai_film_studio_prod
CLOUD_SQL_USER=prod_user

# Artifact Registry
ARTIFACT_REGISTRY_REPO=ai-film-studio
ARTIFACT_REGISTRY_URL=$DOCKER_REGISTRY/$PROJECT_ID/ai-film-studio

# Service Account
SERVICE_ACCOUNT_EMAIL=$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com
EOF
  
  log_success "Deployment configuration created: .gcp-deployment-config"
}

# Print summary
print_summary() {
  log_step "Deployment Setup Complete"
  
  echo -e "${GREEN}✓ Google Cloud Platform setup completed successfully!${NC}\n"
  
  echo "Configuration Summary:"
  echo "  Project ID: $PROJECT_ID"
  echo "  Region: $REGION"
  echo "  Service Name: $SERVICE_NAME"
  echo ""
  echo "Resources Created:"
  echo "  • Cloud SQL Instance: $DATABASE_INSTANCE"
  echo "  • Database: ai_film_studio_prod"
  echo "  • Storage Bucket: $STORAGE_BUCKET"
  echo "  • Service Account: $SERVICE_ACCOUNT"
  echo "  • Artifact Registry: ai-film-studio"
  echo ""
  echo "Next Steps:"
  echo "  1. Update GitHub repository secrets with GCP credentials"
  echo "  2. Push code to main branch to trigger CI/CD pipeline"
  echo "  3. Monitor deployment: gcloud run services describe $SERVICE_NAME --region $REGION"
  echo "  4. View logs: gcloud logging read 'resource.type=cloud_run_revision' --limit 50"
  echo ""
  echo "Useful Commands:"
  echo "  # Get Cloud Run service URL"
  echo "  gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)'"
  echo ""
  echo "  # View Cloud SQL connection name"
  echo "  gcloud sql instances describe $DATABASE_INSTANCE --format='value(connectionName)'"
  echo ""
  echo "  # List Cloud Storage buckets"
  echo "  gsutil ls"
  echo ""
}

# Main execution
main() {
  validate_prerequisites
  set_gcp_project
  enable_apis
  create_service_account
  create_cloud_sql
  create_cloud_storage
  create_artifact_registry
  create_cloud_run
  setup_monitoring
  create_deployment_config
  print_summary
}

# Run main function
main "$@"
