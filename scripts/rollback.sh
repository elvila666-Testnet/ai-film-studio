#!/bin/bash

################################################################################
# AI Film Studio - Rollback and Recovery Script
#
# This script handles:
# - Version rollback
# - Database recovery
# - Configuration restoration
# - Emergency recovery procedures
#
# Usage: ./scripts/rollback.sh [version] [options]
# Options: --dry-run, --verbose, --force
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
ROLLBACK_LOG="${PROJECT_ROOT}/logs/rollback-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="${PROJECT_ROOT}/backups"
VERSIONS_DIR="${PROJECT_ROOT}/.deployment-versions"

# Default values
VERSION="${1:-}"
DRY_RUN=false
VERBOSE=false
FORCE=false

# Parse arguments
while [[ $# -gt 1 ]]; do
  case "$2" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

# Create logs directory
mkdir -p "${PROJECT_ROOT}/logs"

log_info "=========================================="
log_info "AI Film Studio - Rollback Script"
log_info "=========================================="
log_info "Timestamp: $(date)"

# Validate version parameter
if [[ -z "$VERSION" ]]; then
  log_error "Version parameter required"
  echo "Usage: ./scripts/rollback.sh <version> [options]"
  echo ""
  echo "Available versions:"
  if [[ -d "$VERSIONS_DIR" ]]; then
    ls -1 "$VERSIONS_DIR" | head -10
  else
    echo "  (no versions found)"
  fi
  exit 1
fi

# Check if version exists
VERSION_FILE="${VERSIONS_DIR}/${VERSION}.json"
if [[ ! -f "$VERSION_FILE" ]] && [[ "$FORCE" != true ]]; then
  log_error "Version not found: $VERSION"
  exit 1
fi

# Confirmation prompt
if [[ "$DRY_RUN" != true ]] && [[ "$FORCE" != true ]]; then
  log_warning "This will rollback to version: $VERSION"
  read -p "Are you sure? (yes/no): " -r
  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_info "Rollback cancelled"
    exit 0
  fi
fi

# Create backup of current state
log_info "Creating backup of current deployment..."
CURRENT_BACKUP="${BACKUP_DIR}/pre-rollback-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$CURRENT_BACKUP"

if [[ "$DRY_RUN" != true ]]; then
  cp -r "${PROJECT_ROOT}/dist" "$CURRENT_BACKUP/" 2>/dev/null || true
  cp -r "${PROJECT_ROOT}/client/dist" "$CURRENT_BACKUP/" 2>/dev/null || true
  log_success "Current deployment backed up to: $CURRENT_BACKUP"
else
  log_info "[DRY RUN] Would backup current deployment to: $CURRENT_BACKUP"
fi

# Stop application
log_info "Stopping application..."
if [[ "$DRY_RUN" != true ]]; then
  # Kill any running node processes for this project
  pkill -f "node.*dist/index.js" || true
  sleep 2
  log_success "Application stopped"
else
  log_info "[DRY RUN] Would stop the application"
fi

# Restore version
log_info "Restoring version: $VERSION"

if [[ -f "$VERSION_FILE" ]]; then
  # Read version metadata
  VERSION_COMMIT=$(jq -r '.commit' "$VERSION_FILE" 2>/dev/null || echo "")
  VERSION_BRANCH=$(jq -r '.branch' "$VERSION_FILE" 2>/dev/null || echo "")
  VERSION_TIMESTAMP=$(jq -r '.timestamp' "$VERSION_FILE" 2>/dev/null || echo "")
  
  log_info "Version commit: $VERSION_COMMIT"
  log_info "Version branch: $VERSION_BRANCH"
  log_info "Version timestamp: $VERSION_TIMESTAMP"
  
  if [[ "$DRY_RUN" != true ]]; then
    # Checkout version
    if [[ -n "$VERSION_COMMIT" ]]; then
      log_info "Checking out commit: $VERSION_COMMIT"
      cd "$PROJECT_ROOT"
      git checkout "$VERSION_COMMIT" || {
        log_error "Failed to checkout version"
        exit 1
      }
    fi
  else
    log_info "[DRY RUN] Would checkout commit: $VERSION_COMMIT"
  fi
fi

# Restore database
log_info "Checking for database backup to restore..."
DB_BACKUP="${BACKUP_DIR}/db-backup-${VERSION}.sql"

if [[ -f "$DB_BACKUP" ]]; then
  log_warning "Database backup found: $DB_BACKUP"
  log_warning "Implement database-specific restore based on your database type"
  log_info "For MySQL: mysql -u user -p database < $DB_BACKUP"
  log_info "For PostgreSQL: psql dbname < $DB_BACKUP"
else
  log_info "No database backup found for this version"
fi

# Rebuild application
log_info "Rebuilding application..."
if [[ "$DRY_RUN" != true ]]; then
  cd "$PROJECT_ROOT"
  
  # Detect package manager
  if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
  else
    PKG_MANAGER="npm"
  fi
  
  # Install dependencies
  log_info "Installing dependencies..."
  $PKG_MANAGER install --frozen-lockfile || {
    log_error "Failed to install dependencies"
    exit 1
  }
  
  # Build
  log_info "Building application..."
  $PKG_MANAGER run build || {
    log_error "Build failed"
    exit 1
  }
  
  log_success "Application rebuilt successfully"
else
  log_info "[DRY RUN] Would rebuild application"
fi

# Verify rollback
log_info "Verifying rollback..."
if [[ "$DRY_RUN" != true ]]; then
  if [[ -f "${PROJECT_ROOT}/dist/index.js" ]]; then
    log_success "Build artifacts verified"
  else
    log_error "Build artifacts missing after rollback"
    exit 1
  fi
fi

# Start application
log_info "Starting application..."
if [[ "$DRY_RUN" != true ]]; then
  cd "$PROJECT_ROOT"
  # Note: In production, use a process manager like PM2
  # pm2 start dist/index.js --name ai-film-studio
  log_info "Application ready to start"
  log_info "Run: npm start"
else
  log_info "[DRY RUN] Would start the application"
fi

# Create rollback record
ROLLBACK_RECORD="${PROJECT_ROOT}/rollback-record-$(date +%Y%m%d-%H%M%S).json"
cat > "$ROLLBACK_RECORD" << EOF
{
  "rollback": {
    "timestamp": "$(date -Iseconds)",
    "from_version": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
    "to_version": "$VERSION",
    "status": "completed",
    "backup_location": "$CURRENT_BACKUP"
  }
}
EOF

log_info "=========================================="
if [[ "$DRY_RUN" == true ]]; then
  log_warning "DRY RUN MODE - No actual changes were made"
else
  log_success "Rollback completed successfully!"
fi
log_info "=========================================="
log_info "Rollback record: $ROLLBACK_RECORD"
log_info "Next steps:"
log_info "1. Verify application health: ./scripts/health-check.sh"
log_info "2. Check logs: tail -f logs/deployment-*.log"
log_info "3. If issues persist, restore from backup: $CURRENT_BACKUP"

exit 0
