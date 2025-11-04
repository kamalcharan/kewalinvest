#!/bin/bash

################################################################################
# Kewalinvest Database Deployment Script
#
# This script automatically deploys the database schema in the correct order.
# It handles all SQL scripts including init, tables, indexes, triggers, and more.
#
# Usage:
#   ./deploy_database.sh [environment] [options]
#
# Environments:
#   development  - Deploy to development database
#   staging      - Deploy to staging database
#   production   - Deploy to production database
#
# Options:
#   --skip-seed  - Skip seed data insertion (05_seed_data.sql)
#   --dry-run    - Show what would be done without executing
#   --help       - Show this help message
#
# Examples:
#   ./deploy_database.sh development
#   ./deploy_database.sh staging --skip-seed
#   ./deploy_database.sh production --dry-run
#
################################################################################

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
SKIP_SEED=false
DRY_RUN=false

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

################################################################################
# Functions
################################################################################

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

log_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

show_help() {
    head -n 27 "$0" | tail -n +3 | sed 's/^# //'
    exit 0
}

get_db_config() {
    local env=$1

    case $env in
        development)
            DB_NAME="kewalinvest_dev"
            DB_USER="kewal_admin"
            DB_HOST="localhost"
            DB_PORT="5432"
            ;;
        staging)
            DB_NAME="kewalinvest_staging"
            DB_USER="kewal_staging_user"
            DB_HOST="${STAGING_DB_HOST:-localhost}"
            DB_PORT="5432"
            ;;
        production)
            DB_NAME="kewalinvest_prod"
            DB_USER="kewal_prod_user"
            DB_HOST="${PROD_DB_HOST:-localhost}"
            DB_PORT="5432"
            ;;
        *)
            log_error "Unknown environment: $env"
            exit 1
            ;;
    esac
}

check_prerequisites() {
    log_section "Checking Prerequisites"

    # Check PostgreSQL client
    if ! command -v psql &> /dev/null; then
        log_error "psql command not found. Please install PostgreSQL client."
        exit 1
    fi
    log_info "PostgreSQL client found: $(psql --version)"

    # Check if scripts exist
    local scripts=("01_init.sql" "02_tables.sql" "03_indexes_triggers.sql" "04_functions_views_policies.sql" "05_seed_data.sql")
    for script in "${scripts[@]}"; do
        if [ ! -f "$SCRIPT_DIR/$script" ]; then
            log_error "Script not found: $script"
            exit 1
        fi
    done
    log_success "All required scripts found"
}

check_database_connection() {
    log_section "Checking Database Connection"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would check connection to $DB_NAME on $DB_HOST"
        return
    fi

    log_info "Testing connection to $DB_NAME on $DB_HOST..."

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1" &> /dev/null; then
        log_success "Database connection successful"
    else
        log_error "Failed to connect to database"
        log_info "Please check your database credentials and ensure PostgreSQL is running"
        exit 1
    fi
}

create_database_if_not_exists() {
    log_section "Creating Database (if not exists)"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would check if database $DB_NAME exists"
        return
    fi

    # Check if database exists
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        log_warning "Database $DB_NAME already exists"
    else
        log_info "Creating database $DB_NAME..."
        createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
        log_success "Database created"
    fi
}

backup_database() {
    log_section "Backing Up Database (if exists)"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would backup database $DB_NAME"
        return
    fi

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        local backup_file="$SCRIPT_DIR/../backups/backup_${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql"
        mkdir -p "$SCRIPT_DIR/../backups"

        log_info "Creating backup: $backup_file"
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$backup_file"
        log_success "Backup created"
    else
        log_info "No existing database to backup"
    fi
}

run_sql_script() {
    local script_name=$1
    local script_path="$SCRIPT_DIR/$script_name"

    log_section "Running Script: $script_name"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would execute: $script_path"
        return
    fi

    log_info "Executing $script_name..."

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$script_path" -v ON_ERROR_STOP=1; then
        log_success "$script_name completed successfully"
    else
        log_error "$script_name failed"
        log_warning "Database may be in an inconsistent state"
        log_info "Consider restoring from backup"
        exit 1
    fi
}

verify_deployment() {
    log_section "Verifying Deployment"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would verify deployment"
        return
    fi

    log_info "Checking tables..."
    local table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
    log_info "Tables created: $table_count"

    log_info "Checking indexes..."
    local index_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';")
    log_info "Indexes created: $index_count"

    log_info "Checking triggers..."
    local trigger_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public';")
    log_info "Triggers created: $trigger_count"

    if [ "$table_count" -gt 20 ]; then
        log_success "Deployment verification passed"
    else
        log_warning "Table count seems low. Please verify manually."
    fi
}

################################################################################
# Parse Arguments
################################################################################

while [[ $# -gt 0 ]]; do
    case $1 in
        development|staging|production)
            ENVIRONMENT="$1"
            shift
            ;;
        --skip-seed)
            SKIP_SEED=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            show_help
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

################################################################################
# Main Execution
################################################################################

log_section "Kewalinvest Database Deployment"
log_info "Environment: $ENVIRONMENT"
log_info "Skip Seed: $SKIP_SEED"
log_info "Dry Run: $DRY_RUN"
echo ""

# Get database configuration
get_db_config "$ENVIRONMENT"

# Confirmation for production
if [ "$ENVIRONMENT" = "production" ] && [ "$DRY_RUN" = false ]; then
    log_warning "You are about to deploy to PRODUCTION database"
    log_warning "Database: $DB_NAME on $DB_HOST"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

# Execute deployment steps
check_prerequisites
check_database_connection
backup_database
create_database_if_not_exists

# Run SQL scripts in order
run_sql_script "01_init.sql"
run_sql_script "02_tables.sql"
run_sql_script "03_indexes_triggers.sql"
run_sql_script "04_functions_views_policies.sql"

if [ "$SKIP_SEED" = false ]; then
    run_sql_script "05_seed_data.sql"
else
    log_warning "Skipping seed data"
fi

# Verify deployment
verify_deployment

log_section "Deployment Complete"
log_success "Database deployment finished successfully!"
echo ""
log_info "Database: $DB_NAME"
log_info "Host: $DB_HOST"
log_info "Environment: $ENVIRONMENT"
echo ""
log_info "Next steps:"
log_info "1. Update backend/.env with database credentials"
log_info "2. Start backend server: npm run dev"
log_info "3. Test database connection"
echo ""

exit 0
