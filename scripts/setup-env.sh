#!/bin/bash

################################################################################
# AI Film Studio - Environment Setup Script
#
# This script automates the setup of environment variables for different
# deployment environments (development, staging, production)
#
# Usage: ./scripts/setup-env.sh [environment]
# Environments: development, staging, production
################################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-development}"

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_info "=========================================="
log_info "AI Film Studio - Environment Setup"
log_info "=========================================="
log_info "Environment: $ENVIRONMENT"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
  log_error "Invalid environment: $ENVIRONMENT"
  echo "Valid environments: development, staging, production"
  exit 1
fi

# Check if environment file exists
ENV_FILE="${PROJECT_ROOT}/.env.${ENVIRONMENT}"
if [[ -f "$ENV_FILE" ]]; then
  log_warning "Environment file already exists: $ENV_FILE"
  read -p "Overwrite? (y/n): " -r
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Setup cancelled"
    exit 0
  fi
fi

# Create environment file
log_info "Creating environment file: $ENV_FILE"

case "$ENVIRONMENT" in
  development)
    cat > "$ENV_FILE" << 'EOF'
# Development Environment Configuration
NODE_ENV=development
PORT=3000
DEBUG=true

# Database - Local development
DATABASE_URL=mysql://root:root@localhost:3306/ai_film_studio

# Authentication
JWT_SECRET=dev-secret-key-change-in-production
VITE_APP_ID=dev-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://app.manus.im/login

# Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=dev-forge-key
VITE_FRONTEND_FORGE_API_KEY=dev-frontend-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge

# AI Services - Use mock implementations in development
OPENAI_API_KEY=sk-dev-key
GEMINI_API_KEY=dev-gemini-key
SORA_API_KEY=dev-sora-key
VEO3_API_KEY=dev-veo3-key
NANOBANANA_API_KEY=dev-nanobanana-key

# ElevenLabs
ELEVENLABS_API_KEY=dev-elevenlabs-key

# Application
VITE_APP_TITLE=AI Film Studio (Dev)
VITE_APP_LOGO=/logo.svg
OWNER_NAME=Developer
OWNER_OPEN_ID=dev-open-id

# Development settings
MOCK_EXTERNAL_SERVICES=true
SEED_DATABASE=true
HOT_RELOAD=true
LOG_LEVEL=debug
LOG_REQUESTS=true

# Feature flags
FEATURE_ADVANCED_ANALYTICS=false
FEATURE_BATCH_PROCESSING=false
FEATURE_REAL_TIME_COLLABORATION=false
EOF
    ;;
    
  staging)
    cat > "$ENV_FILE" << 'EOF'
# Staging Environment Configuration
NODE_ENV=production
PORT=3000
DEBUG=false

# Database - Staging database
DATABASE_URL=mysql://staging_user:STAGING_PASSWORD@staging-db.example.com:3306/ai_film_studio_staging

# Authentication
JWT_SECRET=STAGING_JWT_SECRET_CHANGE_ME
VITE_APP_ID=staging-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://app.manus.im/login

# Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=STAGING_FORGE_API_KEY
VITE_FRONTEND_FORGE_API_KEY=STAGING_FRONTEND_KEY
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge

# AI Services
OPENAI_API_KEY=STAGING_OPENAI_KEY
GEMINI_API_KEY=STAGING_GEMINI_KEY
SORA_API_KEY=STAGING_SORA_KEY
VEO3_API_KEY=STAGING_VEO3_KEY
NANOBANANA_API_KEY=STAGING_NANOBANANA_KEY

# ElevenLabs
ELEVENLABS_API_KEY=STAGING_ELEVENLABS_KEY

# Application
VITE_APP_TITLE=AI Film Studio (Staging)
VITE_APP_LOGO=/logo.svg
OWNER_NAME=Staging Admin
OWNER_OPEN_ID=staging-open-id

# Staging settings
MOCK_EXTERNAL_SERVICES=false
SEED_DATABASE=false
HOT_RELOAD=false
LOG_LEVEL=info
LOG_REQUESTS=true

# Feature flags
FEATURE_ADVANCED_ANALYTICS=true
FEATURE_BATCH_PROCESSING=true
FEATURE_REAL_TIME_COLLABORATION=false

# Rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
MAX_UPLOAD_SIZE_MB=500
MAX_CONCURRENT_JOBS=10
EOF
    ;;
    
  production)
    cat > "$ENV_FILE" << 'EOF'
# Production Environment Configuration
NODE_ENV=production
PORT=3000
DEBUG=false

# Database - Production database
DATABASE_URL=mysql://prod_user:PROD_PASSWORD@prod-db.example.com:3306/ai_film_studio_prod

# Authentication
JWT_SECRET=PROD_JWT_SECRET_CHANGE_ME
VITE_APP_ID=prod-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://app.manus.im/login

# Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=PROD_FORGE_API_KEY
VITE_FRONTEND_FORGE_API_KEY=PROD_FRONTEND_KEY
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge

# AI Services
OPENAI_API_KEY=PROD_OPENAI_KEY
GEMINI_API_KEY=PROD_GEMINI_KEY
SORA_API_KEY=PROD_SORA_KEY
VEO3_API_KEY=PROD_VEO3_KEY
NANOBANANA_API_KEY=PROD_NANOBANANA_KEY

# ElevenLabs
ELEVENLABS_API_KEY=PROD_ELEVENLABS_KEY

# Application
VITE_APP_TITLE=AI Film Studio
VITE_APP_LOGO=/logo.svg
OWNER_NAME=Production Admin
OWNER_OPEN_ID=prod-open-id

# Production settings
MOCK_EXTERNAL_SERVICES=false
SEED_DATABASE=false
HOT_RELOAD=false
LOG_LEVEL=warn
LOG_REQUESTS=false

# Feature flags
FEATURE_ADVANCED_ANALYTICS=true
FEATURE_BATCH_PROCESSING=true
FEATURE_REAL_TIME_COLLABORATION=true

# Rate limiting
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=60000
MAX_UPLOAD_SIZE_MB=1000
MAX_CONCURRENT_JOBS=50

# Monitoring
SENTRY_DSN=PROD_SENTRY_DSN
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=prod-website-id
EOF
    ;;
esac

log_success "Environment file created: $ENV_FILE"

# Set appropriate permissions
chmod 600 "$ENV_FILE"
log_success "Set secure permissions (600)"

# Display next steps
log_info "=========================================="
log_info "Next steps:"
log_info "1. Edit $ENV_FILE with actual credentials"
log_info "2. Verify all required variables are set"
log_info "3. Run: ./scripts/health-check.sh"
log_info "4. Deploy: ./scripts/deploy.sh $ENVIRONMENT"
log_info "=========================================="

log_success "Environment setup complete!"
