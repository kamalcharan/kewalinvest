#!/bin/bash

################################################################################
# Kewalinvest Platform - Distribution Script
#
# This script automates the build and deployment process for both
# frontend and backend components.
#
# Usage:
#   ./distribute.sh [options]
#
# Options:
#   --env <environment>    Target environment: dev, staging, production (default: dev)
#   --frontend-only        Build and deploy only frontend
#   --backend-only         Build and deploy only backend
#   --skip-tests           Skip running tests
#   --skip-build           Skip build step (deploy existing build)
#   --dry-run              Show what would be done without executing
#   --help                 Show this help message
#
# Examples:
#   ./distribute.sh --env staging
#   ./distribute.sh --frontend-only --env production
#   ./distribute.sh --backend-only --skip-tests
#
################################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
FRONTEND=true
BACKEND=true
SKIP_TESTS=false
SKIP_BUILD=false
DRY_RUN=false

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"

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
    head -n 30 "$0" | tail -n +3 | sed 's/^# //'
    exit 0
}

check_prerequisites() {
    log_section "Checking Prerequisites"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_info "Node.js version: $(node --version)"

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_info "npm version: $(npm --version)"

    # Check TypeScript
    if ! command -v tsc &> /dev/null; then
        log_warning "TypeScript not installed globally (will use local version)"
    fi

    # Check directories
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi

    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi

    log_success "All prerequisites met"
}

check_env_files() {
    log_section "Checking Environment Files"

    if [ "$FRONTEND" = true ]; then
        local frontend_env="$FRONTEND_DIR/.env.$ENVIRONMENT"
        if [ ! -f "$frontend_env" ]; then
            log_warning "Frontend .env.$ENVIRONMENT not found, will use .env"
            if [ ! -f "$FRONTEND_DIR/.env" ]; then
                log_error "Frontend .env file not found"
                exit 1
            fi
        fi
        log_info "Frontend environment file: $frontend_env"
    fi

    if [ "$BACKEND" = true ]; then
        local backend_env="$BACKEND_DIR/.env.$ENVIRONMENT"
        if [ ! -f "$backend_env" ]; then
            log_warning "Backend .env.$ENVIRONMENT not found, will use .env"
            if [ ! -f "$BACKEND_DIR/.env" ]; then
                log_error "Backend .env file not found"
                exit 1
            fi
        fi
        log_info "Backend environment file: $backend_env"
    fi

    log_success "Environment files verified"
}

install_dependencies() {
    local component=$1
    local dir=$2

    log_section "Installing Dependencies - $component"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would install dependencies in $dir"
        return
    fi

    cd "$dir"

    if [ -f "package-lock.json" ]; then
        log_info "Running npm ci for reproducible builds..."
        npm ci --production=false
    else
        log_info "Running npm install..."
        npm install
    fi

    log_success "$component dependencies installed"
}

run_tests() {
    local component=$1
    local dir=$2

    if [ "$SKIP_TESTS" = true ]; then
        log_warning "Skipping tests for $component"
        return
    fi

    log_section "Running Tests - $component"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would run tests in $dir"
        return
    fi

    cd "$dir"

    # Check if test script exists
    if ! npm run | grep -q "test"; then
        log_warning "No test script found for $component"
        return
    fi

    log_info "Running tests..."
    if npm test -- --passWithNoTests --watchAll=false; then
        log_success "$component tests passed"
    else
        log_error "$component tests failed"
        exit 1
    fi
}

build_frontend() {
    if [ "$SKIP_BUILD" = true ]; then
        log_warning "Skipping frontend build"
        return
    fi

    log_section "Building Frontend"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would build frontend"
        return
    fi

    cd "$FRONTEND_DIR"

    # Copy environment-specific .env file
    if [ -f ".env.$ENVIRONMENT" ]; then
        log_info "Using .env.$ENVIRONMENT"
        cp ".env.$ENVIRONMENT" .env
    fi

    log_info "Building React application..."
    npm run build

    # Check build output
    if [ ! -d "build" ]; then
        log_error "Build directory not created"
        exit 1
    fi

    local build_size=$(du -sh build | cut -f1)
    log_success "Frontend built successfully (Size: $build_size)"

    # Show bundle sizes
    log_info "Bundle sizes:"
    du -h build/static/js/*.js | head -5
}

build_backend() {
    if [ "$SKIP_BUILD" = true ]; then
        log_warning "Skipping backend build"
        return
    fi

    log_section "Building Backend"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would build backend"
        return
    fi

    cd "$BACKEND_DIR"

    # Copy environment-specific .env file
    if [ -f ".env.$ENVIRONMENT" ]; then
        log_info "Using .env.$ENVIRONMENT"
        cp ".env.$ENVIRONMENT" .env
    fi

    log_info "Compiling TypeScript..."
    npm run build

    # Check build output
    if [ ! -d "dist" ]; then
        log_error "Dist directory not created"
        exit 1
    fi

    local dist_size=$(du -sh dist | cut -f1)
    log_success "Backend built successfully (Size: $dist_size)"
}

create_deployment_package() {
    log_section "Creating Deployment Package"

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local package_name="kewalinvest_${ENVIRONMENT}_${timestamp}.tar.gz"
    local package_dir="$SCRIPT_DIR/dist"

    mkdir -p "$package_dir"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would create package: $package_name"
        return
    fi

    log_info "Creating deployment package..."

    cd "$SCRIPT_DIR"

    # Create list of files to include
    local include_files=""

    if [ "$FRONTEND" = true ]; then
        include_files="$include_files frontend/build"
        include_files="$include_files frontend/package.json"
    fi

    if [ "$BACKEND" = true ]; then
        include_files="$include_files backend/dist"
        include_files="$include_files backend/package.json"
        include_files="$include_files backend/.env.$ENVIRONMENT"
    fi

    # Add common files
    include_files="$include_files HANDOVER_DOCUMENT.md"
    include_files="$include_files README.md"

    tar -czf "$package_dir/$package_name" $include_files

    local package_size=$(du -h "$package_dir/$package_name" | cut -f1)
    log_success "Deployment package created: $package_name (Size: $package_size)"
    log_info "Package location: $package_dir/$package_name"
}

generate_deployment_report() {
    log_section "Generating Deployment Report"

    local report_file="$SCRIPT_DIR/deployment_report_$(date +%Y%m%d_%H%M%S).txt"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would generate deployment report"
        return
    fi

    {
        echo "======================================"
        echo "Kewalinvest Deployment Report"
        echo "======================================"
        echo ""
        echo "Date: $(date)"
        echo "Environment: $ENVIRONMENT"
        echo "Git Branch: $(git branch --show-current 2>/dev/null || echo 'N/A')"
        echo "Git Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'N/A')"
        echo ""
        echo "Components:"
        [ "$FRONTEND" = true ] && echo "  - Frontend: Built"
        [ "$BACKEND" = true ] && echo "  - Backend: Built"
        echo ""
        echo "Build Settings:"
        echo "  - Skip Tests: $SKIP_TESTS"
        echo "  - Skip Build: $SKIP_BUILD"
        echo ""

        if [ "$FRONTEND" = true ] && [ -d "$FRONTEND_DIR/build" ]; then
            echo "Frontend Build:"
            echo "  - Size: $(du -sh $FRONTEND_DIR/build | cut -f1)"
            echo "  - Files: $(find $FRONTEND_DIR/build -type f | wc -l)"
            echo ""
        fi

        if [ "$BACKEND" = true ] && [ -d "$BACKEND_DIR/dist" ]; then
            echo "Backend Build:"
            echo "  - Size: $(du -sh $BACKEND_DIR/dist | cut -f1)"
            echo "  - Files: $(find $BACKEND_DIR/dist -type f | wc -l)"
            echo ""
        fi

        echo "Node.js Version: $(node --version)"
        echo "npm Version: $(npm --version)"
        echo ""
        echo "======================================"
    } > "$report_file"

    log_success "Deployment report generated: $report_file"

    # Also print to console
    cat "$report_file"
}

deploy_frontend() {
    log_section "Deploying Frontend"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would deploy frontend"
        return
    fi

    log_warning "Manual deployment required:"
    log_info "1. Copy frontend/build/* to your web server"
    log_info "2. Configure nginx/apache to serve static files"
    log_info "3. Set up SSL certificates"
    log_info "4. Update DNS records if needed"
    echo ""
    log_info "Example nginx config:"
    echo "  server {"
    echo "    listen 80;"
    echo "    server_name your-domain.com;"
    echo "    root /var/www/kewalinvest/frontend/build;"
    echo "    index index.html;"
    echo "    location / {"
    echo "      try_files \$uri /index.html;"
    echo "    }"
    echo "  }"
}

deploy_backend() {
    log_section "Deploying Backend"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would deploy backend"
        return
    fi

    log_warning "Manual deployment required:"
    log_info "1. Copy backend/dist/* to your server"
    log_info "2. Copy backend/package.json"
    log_info "3. Run 'npm install --production' on server"
    log_info "4. Set up PM2 or systemd service"
    log_info "5. Configure environment variables"
    echo ""
    log_info "Example PM2 setup:"
    echo "  pm2 start dist/server.js --name kewalinvest-api"
    echo "  pm2 save"
    echo "  pm2 startup"
}

################################################################################
# Parse Arguments
################################################################################

while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --frontend-only)
            BACKEND=false
            shift
            ;;
        --backend-only)
            FRONTEND=false
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
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

log_section "Kewalinvest Distribution Script"
log_info "Environment: $ENVIRONMENT"
log_info "Frontend: $FRONTEND"
log_info "Backend: $BACKEND"
log_info "Skip Tests: $SKIP_TESTS"
log_info "Dry Run: $DRY_RUN"
echo ""

# Confirmation for production
if [ "$ENVIRONMENT" = "production" ] && [ "$DRY_RUN" = false ]; then
    log_warning "You are about to build for PRODUCTION environment"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

# Execute steps
check_prerequisites
check_env_files

if [ "$FRONTEND" = true ]; then
    install_dependencies "Frontend" "$FRONTEND_DIR"
    run_tests "Frontend" "$FRONTEND_DIR"
    build_frontend
fi

if [ "$BACKEND" = true ]; then
    install_dependencies "Backend" "$BACKEND_DIR"
    run_tests "Backend" "$BACKEND_DIR"
    build_backend
fi

create_deployment_package
generate_deployment_report

if [ "$FRONTEND" = true ]; then
    deploy_frontend
fi

if [ "$BACKEND" = true ]; then
    deploy_backend
fi

log_section "Distribution Complete"
log_success "All steps completed successfully!"
echo ""
log_info "Next steps:"
log_info "1. Review deployment report"
log_info "2. Deploy package to target environment"
log_info "3. Run smoke tests"
log_info "4. Monitor application logs"
echo ""

exit 0
