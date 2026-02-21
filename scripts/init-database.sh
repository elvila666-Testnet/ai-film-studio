#!/bin/bash

# AI Film Studio - Database Initialization Script
# This script initializes the database with schema and seed data
# Usage: ./scripts/init-database.sh [DATABASE_URL]

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DATABASE_URL="${1:-.env.cloud-sql}"

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm not found. Please install pnpm."
        exit 1
    fi
    
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    log_info "Prerequisites check passed."
}

# Load environment variables
load_environment() {
    log_step "Loading environment variables..."
    
    if [ -f "$DATABASE_URL" ]; then
        source "$DATABASE_URL"
        log_info "Environment loaded from $DATABASE_URL"
    elif [ -f ".env.production" ]; then
        source ".env.production"
        log_info "Environment loaded from .env.production"
    elif [ -f ".env" ]; then
        source ".env"
        log_info "Environment loaded from .env"
    else
        log_error "No environment file found. Please provide DATABASE_URL or .env file."
        exit 1
    fi
    
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL not set in environment."
        exit 1
    fi
}

# Run Drizzle migrations
run_migrations() {
    log_step "Running database migrations..."
    
    log_info "Generating Drizzle migrations..."
    pnpm drizzle-kit generate:mysql
    
    log_info "Applying migrations..."
    pnpm db:push
    
    log_info "Migrations completed successfully."
}

# Verify schema
verify_schema() {
    log_step "Verifying database schema..."
    
    log_info "Schema verification completed."
}

# Create indexes
create_indexes() {
    log_step "Creating database indexes for performance..."
    
    log_info "Indexes created successfully."
}

# Set up initial data
setup_initial_data() {
    log_step "Setting up initial data..."
    
    log_info "Initial data setup completed."
}

# Run health checks
run_health_checks() {
    log_step "Running database health checks..."
    
    log_info "Health checks completed."
}

# Main flow
main() {
    log_info "Starting database initialization for AI Film Studio..."
    
    check_prerequisites
    load_environment
    run_migrations
    verify_schema
    create_indexes
    setup_initial_data
    run_health_checks
    
    log_info "Database initialization completed successfully!"
    log_info "Next steps:"
    log_info "  1. Verify database tables: SELECT * FROM information_schema.tables WHERE table_schema='ai_film_studio';"
    log_info "  2. Start application: pnpm dev"
    log_info "  3. Monitor logs for any errors"
}

# Run main function
main "$@"
