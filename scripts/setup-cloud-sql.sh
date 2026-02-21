#!/bin/bash

# AI Film Studio - Cloud SQL Setup Script
# This script automates the creation and configuration of Cloud SQL database for production
# Usage: ./scripts/setup-cloud-sql.sh [PROJECT_ID] [INSTANCE_NAME] [REGION] [MACHINE_TYPE]

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${1:-ai-films-prod}"
INSTANCE_NAME="${2:-ai-film-studio-db}"
REGION="${3:-us-central1}"
MACHINE_TYPE="${4:-db-f1-micro}"
DB_NAME="ai_film_studio"
DB_USER="ai_film_studio"
ROOT_PASSWORD=$(openssl rand -base64 32)
APP_PASSWORD=$(openssl rand -base64 32)

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
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
    
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI not found. Please install Google Cloud SDK."
        exit 1
    fi
    
    if ! command -v mysql &> /dev/null; then
        log_warn "mysql CLI not found. You may need to install mysql-client for local testing."
    fi
    
    log_info "Prerequisites check passed."
}

# Set Google Cloud project
set_gcp_project() {
    log_step "Setting Google Cloud project to $PROJECT_ID..."
    gcloud config set project $PROJECT_ID
    log_info "Project set successfully."
}

# Create Cloud SQL instance
create_cloud_sql_instance() {
    log_step "Creating Cloud SQL instance: $INSTANCE_NAME..."
    
    gcloud sql instances create $INSTANCE_NAME \
        --database-version=MYSQL_8_0 \
        --tier=$MACHINE_TYPE \
        --region=$REGION \
        --availability-type=REGIONAL \
        --enable-bin-log \
        --backup-start-time=02:00 \
        --retained-backups-count=30 \
        --transaction-log-retention-days=7 \
        --storage-type=PD_SSD \
        --storage-size=10GB \
        --storage-auto-increase \
        --storage-auto-increase-limit=100 \
        --root-password=$ROOT_PASSWORD \
        --database-flags=cloudsql_iam_authentication=on \
        --no-assign-ip \
        --network=default
    
    log_info "Cloud SQL instance created successfully."
    log_warn "Root password: $ROOT_PASSWORD (store this securely)"
}

# Wait for instance to be ready
wait_for_instance() {
    log_step "Waiting for Cloud SQL instance to be ready..."
    
    for i in {1..60}; do
        STATUS=$(gcloud sql instances describe $INSTANCE_NAME --format='value(state)')
        if [ "$STATUS" = "RUNNABLE" ]; then
            log_info "Instance is ready."
            return 0
        fi
        echo -n "."
        sleep 5
    done
    
    log_error "Instance did not become ready within 5 minutes."
    exit 1
}

# Get instance IP address
get_instance_ip() {
    log_step "Retrieving instance IP address..."
    
    INSTANCE_IP=$(gcloud sql instances describe $INSTANCE_NAME --format='value(ipAddresses[0].ipAddress)')
    log_info "Instance IP: $INSTANCE_IP"
}

# Create database
create_database() {
    log_step "Creating application database: $DB_NAME..."
    
    gcloud sql databases create $DB_NAME \
        --instance=$INSTANCE_NAME \
        --charset=utf8mb4 \
        --collation=utf8mb4_unicode_ci
    
    log_info "Database created successfully."
}

# Create application user
create_app_user() {
    log_step "Creating application user: $DB_USER..."
    
    gcloud sql users create $DB_USER \
        --instance=$INSTANCE_NAME \
        --password=$APP_PASSWORD
    
    log_info "Application user created successfully."
    log_warn "App password: $APP_PASSWORD (store this securely)"
}

# Configure backup
configure_backup() {
    log_step "Configuring automated backups..."
    
    gcloud sql instances patch $INSTANCE_NAME \
        --backup-start-time=02:00 \
        --retained-backups-count=30 \
        --transaction-log-retention-days=7
    
    log_info "Backup configuration updated."
}

# Create backup
create_initial_backup() {
    log_step "Creating initial backup..."
    
    BACKUP_ID="initial-$(date +%Y%m%d-%H%M%S)"
    
    gcloud sql backups create \
        --instance=$INSTANCE_NAME \
        --description="Initial backup"
    
    log_info "Initial backup created."
}

# Configure SSL
configure_ssl() {
    log_step "Configuring SSL/TLS..."
    
    gcloud sql ssl-certs create prod-cert \
        --instance=$INSTANCE_NAME
    
    log_info "SSL certificate created."
}

# Configure flags for production
configure_production_flags() {
    log_step "Configuring production database flags..."
    
    gcloud sql instances patch $INSTANCE_NAME \
        --database-flags=\
max_connections=1000,\
slow_query_log=on,\
long_query_time=2,\
log_bin_trust_function_creators=on,\
character_set_server=utf8mb4,\
collation_server=utf8mb4_unicode_ci,\
innodb_buffer_pool_size=2147483648,\
innodb_log_file_size=536870912
    
    log_info "Production flags configured."
}

# Create monitoring alert
create_monitoring_alert() {
    log_step "Creating monitoring alerts..."
    
    # This requires Cloud Monitoring API to be enabled
    log_info "Monitoring alerts configuration (manual step may be required)"
}

# Generate connection string
generate_connection_string() {
    log_step "Generating connection strings..."
    
    log_info "Public IP Connection String:"
    echo "mysql://$DB_USER:$APP_PASSWORD@$INSTANCE_IP:3306/$DB_NAME"
    
    log_info "Private IP Connection String (requires VPC):"
    echo "mysql://$DB_USER:$APP_PASSWORD@<PRIVATE_IP>:3306/$DB_NAME"
}

# Save configuration
save_configuration() {
    log_step "Saving configuration to file..."
    
    cat > .env.cloud-sql << EOF
# Cloud SQL Configuration
CLOUD_SQL_INSTANCE=$PROJECT_ID:$REGION:$INSTANCE_NAME
DATABASE_URL=mysql://$DB_USER:$APP_PASSWORD@$INSTANCE_IP:3306/$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$APP_PASSWORD
DB_HOST=$INSTANCE_IP
DB_PORT=3306
DB_NAME=$DB_NAME
DB_ROOT_PASSWORD=$ROOT_PASSWORD
EOF
    
    log_info "Configuration saved to .env.cloud-sql"
}

# Main deployment flow
main() {
    log_info "Starting Cloud SQL setup for AI Film Studio..."
    log_info "Project: $PROJECT_ID"
    log_info "Instance: $INSTANCE_NAME"
    log_info "Region: $REGION"
    log_info "Machine Type: $MACHINE_TYPE"
    
    check_prerequisites
    set_gcp_project
    create_cloud_sql_instance
    wait_for_instance
    get_instance_ip
    create_database
    create_app_user
    configure_backup
    create_initial_backup
    configure_ssl
    configure_production_flags
    create_monitoring_alert
    generate_connection_string
    save_configuration
    
    log_info "Cloud SQL setup completed successfully!"
    log_info "Next steps:"
    log_info "  1. Review .env.cloud-sql for connection details"
    log_info "  2. Run database migrations: pnpm db:push"
    log_info "  3. Configure VPC connector for private IP access"
    log_info "  4. Set up monitoring and alerts"
}

# Run main function
main "$@"
