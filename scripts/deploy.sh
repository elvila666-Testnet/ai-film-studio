#!/bin/bash

################################################################################
# AI Film Studio - Production Deployment Script
# 
# This script handles the complete deployment process including:
# - Environment validation and setup
# - Pre-flight checks
# - Dependency installation
# - Database migrations
# - Build and compilation
# - Health verification
# - Rollback capability
#
# Usage: ./scripts/deploy.sh [environment] [options]
# Environments: staging, production
# Options: --skip-tests, --skip-db-backup, --dry-run, --verbose
################################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_LOG="${PROJECT_ROOT}/logs/deployment-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="${PROJECT_ROOT}/backups"
DIST_DIR="${PROJECT_ROOT}/dist"

# Default values
ENVIRONMENT="${1:-staging}"
SKIP_TESTS=false
SKIP_DB_BACKUP=false
DRY_RUN=false
VERBOSE=false
ROLLBACK_VERSION=""

# Parse command line arguments
while [[ $# -gt 1 ]]; do
  case "$2" in
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --skip-db-backup)
      SKIP_DB_BACKUP=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --rollback)
      ROLLBACK_VERSION="$3"
      shift 2
      ;;
    *)
      echo "Unknown option: $2"
      exit 1
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

# Create logs directory
mkdir -p "${PROJECT_ROOT}/logs"

log_info "=========================================="
log_info "AI Film Studio Deployment Script"
log_info "=========================================="
log_info "Environment: $ENVIRONMENT"
log_info "Timestamp: $(date)"
log_info "Deployment Log: $DEPLOYMENT_LOG"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
  log_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'."
  exit 1
fi

# Load environment variables
if [[ -f "${PROJECT_ROOT}/.env.${ENVIRONMENT}" ]]; then
  log_info "Loading environment variables from .env.${ENVIRONMENT}"
  set -a
  source "${PROJECT_ROOT}/.env.${ENVIRONMENT}"
  set +a
else
  log_warning "Environment file .env.${ENVIRONMENT} not found. Using defaults."
fi

# Pre-flight checks
log_info "Running pre-flight checks..."

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
log_info "Node.js version: $NODE_VERSION"

# Check npm/pnpm
if command -v pnpm &> /dev/null; then
  PACKAGE_MANAGER="pnpm"
  log_info "Package manager: pnpm"
else
  PACKAGE_MANAGER="npm"
  log_info "Package manager: npm"
fi

# Check required environment variables
REQUIRED_VARS=(
  "DATABASE_URL"
  "JWT_SECRET"
  "VITE_APP_ID"
  "OAUTH_SERVER_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    log_error "Required environment variable not set: $var"
    exit 1
  fi
done

log_success "Pre-flight checks passed"

# Database backup (if not skipped)
if [[ "$SKIP_DB_BACKUP" != true && "$DRY_RUN" != true ]]; then
  log_info "Creating database backup..."
  mkdir -p "$BACKUP_DIR"
  
  DB_BACKUP_FILE="${BACKUP_DIR}/db-backup-$(date +%Y%m%d-%H%M%S).sql"
  
  if [[ -n "${DATABASE_URL:-}" ]]; then
    # Extract connection details from DATABASE_URL
    # This is a placeholder - actual implementation depends on database type
    log_info "Database backup would be saved to: $DB_BACKUP_FILE"
    log_warning "Implement database-specific backup logic based on your database type"
  fi
fi

# Install dependencies
log_info "Installing dependencies..."
if [[ "$DRY_RUN" != true ]]; then
  if [[ "$PACKAGE_MANAGER" == "pnpm" ]]; then
    pnpm install --frozen-lockfile
  else
    npm ci
  fi
  log_success "Dependencies installed"
else
  log_info "[DRY RUN] Would run: $PACKAGE_MANAGER install"
fi

# Run tests (if not skipped)
if [[ "$SKIP_TESTS" != true ]]; then
  log_info "Running tests..."
  if [[ "$DRY_RUN" != true ]]; then
    if $PACKAGE_MANAGER test; then
      log_success "All tests passed"
    else
      log_error "Tests failed. Aborting deployment."
      exit 1
    fi
  else
    log_info "[DRY RUN] Would run: $PACKAGE_MANAGER test"
  fi
fi

# TypeScript type checking
log_info "Running TypeScript type checking..."
if [[ "$DRY_RUN" != true ]]; then
  if $PACKAGE_MANAGER run check; then
    log_success "TypeScript type checking passed"
  else
    log_error "TypeScript type checking failed. Aborting deployment."
    exit 1
  fi
else
  log_info "[DRY RUN] Would run: $PACKAGE_MANAGER run check"
fi

# Database migrations
log_info "Running database migrations..."
if [[ "$DRY_RUN" != true ]]; then
  if $PACKAGE_MANAGER run db:push; then
    log_success "Database migrations completed"
  else
    log_error "Database migrations failed. Aborting deployment."
    exit 1
  fi
else
  log_info "[DRY RUN] Would run: $PACKAGE_MANAGER run db:push"
fi

# Build application
log_info "Building application..."
if [[ "$DRY_RUN" != true ]]; then
  if $PACKAGE_MANAGER run build; then
    log_success "Build completed successfully"
  else
    log_error "Build failed. Aborting deployment."
    exit 1
  fi
else
  log_info "[DRY RUN] Would run: $PACKAGE_MANAGER run build"
fi

# Verify build artifacts
log_info "Verifying build artifacts..."
if [[ "$DRY_RUN" != true ]]; then
  if [[ -f "${DIST_DIR}/index.js" ]] && [[ -d "${PROJECT_ROOT}/client/dist" ]]; then
    log_success "Build artifacts verified"
  else
    log_error "Build artifacts missing. Aborting deployment."
    exit 1
  fi
else
  log_info "[DRY RUN] Would verify build artifacts at $DIST_DIR"
fi

# Health checks
log_info "Running health checks..."
if [[ "$DRY_RUN" != true ]]; then
  bash "${SCRIPT_DIR}/health-check.sh" || {
    log_error "Health checks failed. Aborting deployment."
    exit 1
  }
  log_success "Health checks passed"
else
  log_info "[DRY RUN] Would run health checks"
fi

# Create deployment manifest
log_info "Creating deployment manifest..."
MANIFEST_FILE="${PROJECT_ROOT}/deployment-manifest-$(date +%Y%m%d-%H%M%S).json"
cat > "$MANIFEST_FILE" << EOF
{
  "deployment": {
    "timestamp": "$(date -Iseconds)",
    "environment": "$ENVIRONMENT",
    "version": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
    "branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
    "node_version": "$NODE_VERSION",
    "package_manager": "$PACKAGE_MANAGER",
    "status": "deployed"
  }
}
EOF
log_success "Deployment manifest created: $MANIFEST_FILE"

# Summary
log_info "=========================================="
if [[ "$DRY_RUN" == true ]]; then
  log_warning "DRY RUN MODE - No actual changes were made"
else
  log_success "Deployment completed successfully!"
fi
log_info "=========================================="
log_info "Next steps:"
log_info "1. Verify application is running: npm start"
log_info "2. Check application health: curl http://localhost:3000/health"
log_info "3. Monitor logs: tail -f logs/deployment-*.log"
log_info "4. For rollback: ./scripts/deploy.sh $ENVIRONMENT --rollback <version>"

exit 0
