#!/bin/bash

# AI Film Studio - Google Cloud Deployment Script
# This script automates the deployment of AI Film Studio to Google Cloud Run
# Usage: ./scripts/deploy-gcp.sh [PROJECT_ID] [REGION] [ENVIRONMENT]

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${1:-ai-film-studio-prod}"
REGION="${2:-us-central1}"
ENVIRONMENT="${3:-production}"
SERVICE_NAME="ai-film-studio"
IMAGE_NAME="ai-film-studio-app"
REGISTRY_REGION="us-central1"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI not found. Please install Google Cloud SDK."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install Docker."
        exit 1
    fi
    
    log_info "Prerequisites check passed."
}

# Set Google Cloud project
set_gcp_project() {
    log_info "Setting Google Cloud project to $PROJECT_ID..."
    gcloud config set project $PROJECT_ID
    gcloud auth configure-docker $REGISTRY_REGION-docker.pkg.dev
}

# Build Docker image
build_docker_image() {
    log_info "Building Docker image..."
    
    docker build \
        --tag $REGISTRY_REGION-docker.pkg.dev/$PROJECT_ID/$SERVICE_NAME/$IMAGE_NAME:latest \
        --tag $REGISTRY_REGION-docker.pkg.dev/$PROJECT_ID/$SERVICE_NAME/$IMAGE_NAME:$(date +%Y%m%d-%H%M%S) \
        --build-arg NODE_ENV=$ENVIRONMENT \
        .
    
    log_info "Docker image built successfully."
}

# Push Docker image to Artifact Registry
push_docker_image() {
    log_info "Pushing Docker image to Artifact Registry..."
    
    docker push $REGISTRY_REGION-docker.pkg.dev/$PROJECT_ID/$SERVICE_NAME/$IMAGE_NAME:latest
    
    log_info "Docker image pushed successfully."
}

# Deploy to Cloud Run
deploy_to_cloud_run() {
    log_info "Deploying to Cloud Run..."
    
    gcloud run deploy $SERVICE_NAME \
        --image=$REGISTRY_REGION-docker.pkg.dev/$PROJECT_ID/$SERVICE_NAME/$IMAGE_NAME:latest \
        --platform=managed \
        --region=$REGION \
        --memory=2Gi \
        --cpu=2 \
        --timeout=3600 \
        --allow-unauthenticated \
        --service-account=$SERVICE_NAME-app@$PROJECT_ID.iam.gserviceaccount.com \
        --set-cloudsql-instances=$PROJECT_ID:$REGION:$SERVICE_NAME-db \
        --env-vars-file=.env.production \
        --no-gen2
    
    log_info "Cloud Run deployment completed."
}

# Get Cloud Run service URL
get_service_url() {
    log_info "Retrieving Cloud Run service URL..."
    
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
        --region=$REGION \
        --format='value(status.url)')
    
    log_info "Service URL: $SERVICE_URL"
    echo $SERVICE_URL
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    SERVICE_URL=$(get_service_url)
    
    # Test API health endpoint
    log_info "Testing API health endpoint..."
    if curl -f $SERVICE_URL/api/health > /dev/null 2>&1; then
        log_info "Health check passed."
    else
        log_warn "Health check failed. Service may still be starting."
    fi
    
    # Test OAuth endpoint
    log_info "Testing OAuth endpoint..."
    if curl -f $SERVICE_URL/api/oauth/callback > /dev/null 2>&1; then
        log_info "OAuth endpoint test passed."
    else
        log_warn "OAuth endpoint test failed."
    fi
}

# Main deployment flow
main() {
    log_info "Starting AI Film Studio deployment to Google Cloud..."
    log_info "Project: $PROJECT_ID"
    log_info "Region: $REGION"
    log_info "Environment: $ENVIRONMENT"
    
    check_prerequisites
    set_gcp_project
    build_docker_image
    push_docker_image
    deploy_to_cloud_run
    run_health_checks
    
    SERVICE_URL=$(get_service_url)
    
    log_info "Deployment completed successfully!"
    log_info "Application URL: $SERVICE_URL"
    log_info "Next steps:"
    log_info "  1. Configure custom domain (if needed)"
    log_info "  2. Set up monitoring and alerts"
    log_info "  3. Configure backup and disaster recovery"
}

# Run main function
main "$@"
