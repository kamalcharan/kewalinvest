#!/bin/bash

# ============================================================================
# KewalInvest - Docker Update Script
# Pulls latest Docker images and restarts containers
# NO database changes
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
echo -e "${CYAN}  KewalInvest - Docker Update${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""
echo "This will:"
echo "   - Pull latest Docker images"
echo "   - Restart containers"
echo ""
echo -e "${YELLOW}NO database changes will be made.${NC}"
echo ""

# ============================================================================
# Load Environment
# ============================================================================
if [ ! -f ".env" ]; then
    echo -e "${RED}[X] ERROR: .env file not found!${NC}"
    echo "Run ./configure.sh first."
    exit 1
fi

# Fix Windows line endings
sed -i 's/\r$//' .env 2>/dev/null || sed -i '' 's/\r$//' .env 2>/dev/null || true

# Load environment variables
set -a
source .env
set +a

echo "Configuration:"
echo "   Instance: ${INSTANCE_NAME}"
echo "   Registry: ${DOCKER_REGISTRY}"
echo "   Tag: ${IMAGE_TAG}"
echo ""

read -p "Continue with update? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Update cancelled."
    exit 0
fi

echo ""

# ============================================================================
# Pull Latest Images
# ============================================================================
echo -e "${BLUE}Pulling Latest Images${NC}"
echo "-------------------------------------------"

echo "   - ${DOCKER_REGISTRY}/kewalinvest-backend:${IMAGE_TAG}"
echo "   - ${DOCKER_REGISTRY}/kewalinvest-frontend:${IMAGE_TAG}"
echo ""

if ! docker-compose -f docker-compose.prod.yml pull; then
    echo -e "${RED}[X] Failed to pull Docker images${NC}"
    exit 1
fi

echo -e "${GREEN}[OK] Images pulled successfully${NC}"
echo ""

# ============================================================================
# Stop Containers
# ============================================================================
echo -e "${BLUE}Stopping Services${NC}"
echo "-------------------------------------------"

docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

# Force remove stuck containers
echo "Cleaning up stuck containers..."
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
echo -e "${BLUE}Starting Services${NC}"
echo "-------------------------------------------"

docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "Waiting for services..."
sleep 5

# Wait for database
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec ${INSTANCE_NAME}_db pg_isready -U ${DB_USER} -d ${DB_NAME} > /dev/null 2>&1; then
        echo -e "${GREEN}[OK] Database is ready${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   Waiting for database... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

# Wait for backend
echo "Checking backend..."
sleep 5

if curl -s http://localhost:${BACKEND_PORT}/health > /dev/null 2>&1; then
    echo -e "${GREEN}[OK] Backend is ready${NC}"
else
    echo -e "${YELLOW}[!] Backend may still be starting${NC}"
fi

echo ""

# ============================================================================
# Complete
# ============================================================================
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  [OK] Docker Update Complete!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "Access Points:"
echo "   Frontend:  http://localhost:${FRONTEND_PORT}"
echo "   Backend:   http://localhost:${BACKEND_PORT}"
echo ""
echo "Container Status:"
docker-compose -f docker-compose.prod.yml ps
echo ""
echo -e "${YELLOW}Note: No database changes were made.${NC}"
echo -e "${YELLOW}To run migrations: ./updateMigrations.sh${NC}"
echo ""
