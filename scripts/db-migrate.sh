#!/bin/bash

################################################################################
# AI Film Studio - Database Migration and Seeding Script
#
# This script handles:
# - Database schema migrations
# - Data seeding for development/staging
# - Database validation
# - Backup and recovery
#
# Usage: ./scripts/db-migrate.sh [command] [options]
# Commands: migrate, seed, validate, backup, restore
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
DB_LOG="${PROJECT_ROOT}/logs/db-migration-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DB_LOG"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DB_LOG"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DB_LOG"
}

# Create logs directory
mkdir -p "${PROJECT_ROOT}/logs"

# Detect package manager
if command -v pnpm &> /dev/null; then
  PKG_MANAGER="pnpm"
else
  PKG_MANAGER="npm"
fi

log_info "Database Migration Script"
log_info "Package Manager: $PKG_MANAGER"

# Main command
COMMAND="${1:-migrate}"

case "$COMMAND" in
  migrate)
    log_info "Running database migrations..."
    cd "$PROJECT_ROOT"
    
    # Generate migration files
    log_info "Generating migration files..."
    if $PKG_MANAGER run db:push; then
      log_success "Database migrations completed successfully"
    else
      log_error "Database migrations failed"
      exit 1
    fi
    ;;

  seed)
    log_info "Seeding database..."
    cd "$PROJECT_ROOT"
    
    # Run seed script if it exists
    if [[ -f "${PROJECT_ROOT}/scripts/seed-db.mjs" ]]; then
      log_info "Running seed script..."
      node "${PROJECT_ROOT}/scripts/seed-db.mjs"
      log_success "Database seeding completed"
    else
      log_warning "No seed script found at scripts/seed-db.mjs"
    fi
    ;;

  validate)
    log_info "Validating database..."
    cd "$PROJECT_ROOT"
    
    # Check database connection
    log_info "Checking database connection..."
    if $PKG_MANAGER run check; then
      log_success "Database validation passed"
    else
      log_error "Database validation failed"
      exit 1
    fi
    ;;

  backup)
    log_info "Creating database backup..."
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_FILE="${BACKUP_DIR}/db-backup-$(date +%Y%m%d-%H%M%S).sql"
    
    # Extract database connection details
    if [[ -n "${DATABASE_URL:-}" ]]; then
      log_info "Backup file: $BACKUP_FILE"
      log_info "Implement database-specific backup based on your database type"
      log_info "For MySQL: mysqldump -u user -p database > $BACKUP_FILE"
      log_info "For PostgreSQL: pg_dump dbname > $BACKUP_FILE"
    else
      log_error "DATABASE_URL not set"
      exit 1
    fi
    ;;

  restore)
    if [[ -z "${2:-}" ]]; then
      log_error "Restore requires a backup file path"
      exit 1
    fi
    
    BACKUP_FILE="$2"
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
      log_error "Backup file not found: $BACKUP_FILE"
      exit 1
    fi
    
    log_info "Restoring database from: $BACKUP_FILE"
    log_info "Implement database-specific restore based on your database type"
    log_info "For MySQL: mysql -u user -p database < $BACKUP_FILE"
    log_info "For PostgreSQL: psql dbname < $BACKUP_FILE"
    ;;

  *)
    log_error "Unknown command: $COMMAND"
    echo "Available commands:"
    echo "  migrate   - Run database migrations"
    echo "  seed      - Seed database with initial data"
    echo "  validate  - Validate database connection and schema"
    echo "  backup    - Create database backup"
    echo "  restore   - Restore database from backup"
    exit 1
    ;;
esac

log_success "Database operation completed"
exit 0
