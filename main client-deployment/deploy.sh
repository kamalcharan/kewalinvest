#!/bin/bash

# ============================================================================
# KewalInvest - Fresh Deployment Script
# Pulls Docker images, creates DB, runs all scripts
# ============================================================================

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}  KewalInvest - Fresh Deployment${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""

# ============================================================================
# Pre-flight Checks
# ============================================================================
echo -e "${BLUE}[1/7] Pre-flight Checks${NC}"
echo "-------------------------------------------"

# Check .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}[X] ERROR: .env file not found!${NC}"
    echo "Run ./configure.sh first to create .env file."
    exit 1
fi
echo -e "${GREEN}[OK] .env file found${NC}"

# Fix Windows line endings
sed -i 's/\r$//' .env 2>/dev/null || sed -i '' 's/\r$//' .env 2>/dev/null || true

# Load environment variables
set -a
source .env
set +a

echo -e "${GREEN}[OK] Environment loaded${NC}"
echo "   Instance: ${INSTANCE_NAME}"
echo "   Registry: ${DOCKER_REGISTRY}"
echo "   Tag: ${IMAGE_TAG}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[X] ERROR: Docker is not installed!${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Docker is installed${NC}"

if ! docker info &> /dev/null; then
    echo -e "${RED}[X] ERROR: Docker daemon is not running!${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Docker daemon is running${NC}"

# Check required files
REQUIRED_DB_FILES=("database/01_init.sql" "database/02_tables.sql" "database/03_indexes_triggers.sql" "database/04_functions_views_policies.sql" "database/05_seed_data.sql")
for file in "${REQUIRED_DB_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}[X] ERROR: Required file not found: $file${NC}"
        exit 1
    fi
done
echo -e "${GREEN}[OK] All database files found${NC}"

echo ""

# ============================================================================
# Check Existing Installation
# ============================================================================
echo -e "${BLUE}[2/7] Checking Existing Installation${NC}"
echo "-------------------------------------------"

if docker volume inspect ${VOLUME_PREFIX}_postgres_data > /dev/null 2>&1; then
    echo -e "${YELLOW}[!] WARNING: Existing installation detected!${NC}"
    echo ""
    echo "Volume ${VOLUME_PREFIX}_postgres_data already exists."
    echo "Running this script will ERASE ALL DATA."
    echo ""
    read -p "Type 'FRESH INSTALL' to confirm: " CONFIRM
    if [ "$CONFIRM" != "FRESH INSTALL" ]; then
        echo -e "${RED}Installation cancelled.${NC}"
        echo "Use ./updateDocker.sh to update existing installation."
        exit 0
    fi
    echo ""
fi

echo -e "${GREEN}[OK] Proceeding with installation${NC}"
echo ""

# ============================================================================
# Pull Docker Images
# ============================================================================
echo -e "${BLUE}[3/7] Pulling Docker Images${NC}"
echo "-------------------------------------------"

echo "Pulling from: ${DOCKER_REGISTRY}"
echo "   - ${DOCKER_REGISTRY}/kewalinvest-backend:${IMAGE_TAG}"
echo "   - ${DOCKER_REGISTRY}/kewalinvest-frontend:${IMAGE_TAG}"
echo ""

if ! docker-compose -f docker-compose.prod.yml pull; then
    echo -e "${RED}[X] Failed to pull Docker images!${NC}"
    echo ""
    echo "Possible causes:"
    echo "  - Images don't exist on Docker Hub"
    echo "  - Network connectivity issues"
    echo "  - Invalid registry/tag in .env"
    exit 1
fi

echo -e "${GREEN}[OK] Images pulled successfully${NC}"
echo ""

# ============================================================================
# Stop & Clean Existing Containers
# ============================================================================
echo -e "${BLUE}[4/7] Cleaning Up${NC}"
echo "-------------------------------------------"

echo "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

echo "Removing old volumes..."
docker volume rm ${VOLUME_PREFIX}_postgres_data 2>/dev/null || true
docker volume rm ${VOLUME_PREFIX}_userfiles_data 2>/dev/null || true
docker volume rm ${VOLUME_PREFIX}_pgadmin_data 2>/dev/null || true

# Remove stuck containers
for suffix in "_db" "_backend" "_frontend" "_pgadmin" "_redis"; do
    container="${INSTANCE_NAME}${suffix}"
    if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
        echo "   Removing: $container"
        docker rm -f "$container" 2>/dev/null || true
    fi
done

echo -e "${GREEN}[OK] Cleanup complete${NC}"
echo ""

# ============================================================================
# Start Services
# ============================================================================
echo -e "${BLUE}[5/7] Starting Services${NC}"
echo "-------------------------------------------"

docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "Waiting for database to be ready..."

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec ${INSTANCE_NAME}_db pg_isready -U ${DB_USER} -d ${DB_NAME} > /dev/null 2>&1; then
        echo -e "${GREEN}[OK] Database is ready!${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}[X] Database failed to start!${NC}"
    docker-compose -f docker-compose.prod.yml logs postgres
    exit 1
fi

echo ""

# ============================================================================
# Run Database Scripts
# ============================================================================
echo -e "${BLUE}[6/7] Setting Up Database${NC}"
echo "-------------------------------------------"

# Run database scripts in order
DB_SCRIPTS=(
    "database/01_init.sql"
    "database/02_tables.sql"
    "database/03_indexes_triggers.sql"
    "database/04_functions_views_policies.sql"
    "database/05_seed_data.sql"
)

for script in "${DB_SCRIPTS[@]}"; do
    script_name=$(basename "$script")
    echo -e "${CYAN}Running: $script_name${NC}"
    
    if docker exec -i ${INSTANCE_NAME}_db psql -U ${DB_USER} -d ${DB_NAME} < "$script" > /tmp/${script_name}.log 2>&1; then
        echo -e "${GREEN}   [OK] $script_name completed${NC}"
    else
        echo -e "${RED}   [X] $script_name failed!${NC}"
        cat /tmp/${script_name}.log
        exit 1
    fi
done

echo ""

# Run migration scripts
echo "Running migrations..."
if [ -d "migrations" ]; then
    for migration in migrations/*.sql; do
        if [ -f "$migration" ]; then
            migration_name=$(basename "$migration")
            echo -e "${CYAN}Running: $migration_name${NC}"
            
            if docker exec -i ${INSTANCE_NAME}_db psql -U ${DB_USER} -d ${DB_NAME} < "$migration" > /tmp/${migration_name}.log 2>&1; then
                echo -e "${GREEN}   [OK] $migration_name completed${NC}"
            else
                echo -e "${YELLOW}   [!] $migration_name completed with warnings${NC}"
            fi
        fi
    done
fi

echo ""
echo -e "${GREEN}[OK] Database setup complete${NC}"
echo ""

# ============================================================================
# Verification
# ============================================================================
echo -e "${BLUE}[7/7] Verification${NC}"
echo "-------------------------------------------"

# Get counts
TABLE_COUNT=$(docker exec ${INSTANCE_NAME}_db psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")
INDEX_COUNT=$(docker exec ${INSTANCE_NAME}_db psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null | xargs || echo "0")
FUNCTION_COUNT=$(docker exec ${INSTANCE_NAME}_db psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public';" 2>/dev/null | xargs || echo "0")

echo "Database Objects:"
echo "   Tables:    $TABLE_COUNT"
echo "   Indexes:   $INDEX_COUNT"
echo "   Functions: $FUNCTION_COUNT"
echo ""

# Validate
if [ "$TABLE_COUNT" -lt "20" ]; then
    echo -e "${RED}[X] Verification failed: Expected at least 20 tables${NC}"
    exit 1
fi

echo -e "${GREEN}[OK] Verification passed${NC}"
echo ""

# ============================================================================
# Complete
# ============================================================================
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  [OK] Deployment Complete!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "Instance: ${INSTANCE_NAME}"
echo ""
echo "Access Points:"
echo "   Frontend:  http://localhost:${FRONTEND_PORT}"
echo "   Backend:   http://localhost:${BACKEND_PORT}"
echo "   pgAdmin:   http://localhost:${PGADMIN_PORT}"
echo ""
echo "Container Status:"
docker-compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || docker-compose -f docker-compose.prod.yml ps
echo ""
echo "Database Summary:"
echo "   Tables:    $TABLE_COUNT"
echo "   Indexes:   $INDEX_COUNT"
echo "   Functions: $FUNCTION_COUNT"
echo ""
echo -e "${YELLOW}Credentials saved to: .credentials.txt${NC}"
echo ""
