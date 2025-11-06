#!/bin/bash

# ============================================================================
# KewalInvest - Update Deployment Script
# Updates frontend and backend without losing data
# ============================================================================

set -e  # Exit on any error

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "  KewalInvest - Update Deployment"
echo "========================================="
echo ""
echo "This will update your installation by:"
echo "  • Pulling latest Docker images"
echo "  • Restarting services"
echo "  • Preserving all existing data"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ ERROR: .env file not found!${NC}"
    echo "Please create .env file with required variables."
    exit 1
fi

# Fix Windows line endings in .env file
sed -i 's/\r$//' .env 2>/dev/null || sed -i '' 's/\r$//' .env 2>/dev/null || true

# Load environment variables
set -a
source .env
set +a

echo "📥 Current Configuration:"
echo "   Registry: ${DOCKER_REGISTRY:-vikuna}"
echo "   Tag: ${IMAGE_TAG:-latest}"
echo ""

# Confirmation prompt
read -p "Continue with update? (yes/no): " CONFIRM
CONFIRM_LOWER=$(echo "$CONFIRM" | tr '[:upper:]' '[:lower:]')
if [ "$CONFIRM_LOWER" != "yes" ] && [ "$CONFIRM_LOWER" != "y" ]; then
    echo "Update cancelled."
    exit 0
fi

echo ""
echo "========================================="
echo "  📦 Backing Up Current State"
echo "========================================="

# Check if containers are running
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "✅ Containers are running"

    # Create backup directory with timestamp
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    echo "📊 Creating database backup..."
    docker exec kewalinvest_db pg_dump -U kewal_admin kewalinvest > "$BACKUP_DIR/kewalinvest_backup.sql" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Database backup failed (may not be accessible)${NC}"
    }

    if [ -f "$BACKUP_DIR/kewalinvest_backup.sql" ]; then
        echo -e "${GREEN}✅ Database backup created: $BACKUP_DIR/kewalinvest_backup.sql${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No running containers found${NC}"
fi

echo ""
echo "========================================="
echo "  📥 Pulling Latest Images"
echo "========================================="

echo "Pulling images from Docker Hub..."
echo "   • ${DOCKER_REGISTRY:-vikuna}/kewalinvest-backend:${IMAGE_TAG:-latest}"
echo "   • ${DOCKER_REGISTRY:-vikuna}/kewalinvest-frontend:${IMAGE_TAG:-latest}"
echo ""

if ! docker-compose -f docker-compose.prod.yml pull; then
    echo ""
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}   ❌ Failed to Pull Docker Images${NC}"
    echo -e "${RED}=========================================${NC}"
    echo ""
    echo -e "${YELLOW}Unable to pull latest images from Docker Hub.${NC}"
    echo ""
    echo "Possible reasons:"
    echo "  • Images don't exist on Docker Hub"
    echo "  • Network connectivity issues"
    echo "  • Wrong registry/tag in .env file"
    echo ""
    echo "Current configuration:"
    echo "  DOCKER_REGISTRY=${DOCKER_REGISTRY:-vikuna}"
    echo "  IMAGE_TAG=${IMAGE_TAG:-latest}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Images pulled successfully${NC}"

echo ""
echo "========================================="
echo "  🔄 Restarting Services"
echo "========================================="

echo "Stopping containers..."
docker-compose -f docker-compose.prod.yml down

echo ""
echo "Starting updated containers..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Wait for database to be ready
echo "🔍 Checking database readiness..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec kewalinvest_db pg_isready -U kewal_admin -d kewalinvest > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database is ready!${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting for database... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Database failed to start!${NC}"
    echo "Check logs: docker-compose -f docker-compose.prod.yml logs database"
    exit 1
fi

# Wait for backend to be ready
echo ""
echo "🔍 Checking backend readiness..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is ready!${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting for backend... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${YELLOW}⚠️  Backend may not be ready yet${NC}"
    echo "Check logs: docker-compose -f docker-compose.prod.yml logs backend"
fi

echo ""
echo "========================================="
echo "  🔍 Database Migrations (Optional)"
echo "========================================="
echo ""
echo "Do you want to apply database migrations?"
echo "  • Only needed if database schema has changed"
echo "  • Safe to skip if only frontend/backend code updated"
echo ""
read -p "Apply database migrations? (yes/no): " APPLY_MIGRATIONS
APPLY_MIGRATIONS_LOWER=$(echo "$APPLY_MIGRATIONS" | tr '[:upper:]' '[:lower:]')

if [ "$APPLY_MIGRATIONS_LOWER" = "yes" ] || [ "$APPLY_MIGRATIONS_LOWER" = "y" ]; then
    echo ""
    echo -e "${BLUE}Applying database migrations...${NC}"

    # Check if migration files exist
    MIGRATION_FILES=(
        "database/03_indexes_triggers.sql"
        "database/04_functions_views_policies.sql"
        "database/06_fix_meetings_table.sql"
    )

    for file in "${MIGRATION_FILES[@]}"; do
        if [ -f "$file" ]; then
            echo "   📄 Applying: $file"
            if docker exec -i kewalinvest_db psql -U kewal_admin kewalinvest < "$file" > /tmp/migration_$(basename $file).log 2>&1; then
                echo -e "${GREEN}      ✅ Applied successfully${NC}"
            else
                echo -e "${RED}      ❌ Failed to apply${NC}"
                echo "      Check /tmp/migration_$(basename $file).log for details"
            fi
        fi
    done

    echo -e "${GREEN}✅ Migrations applied${NC}"
else
    echo "Skipping migrations"
fi

echo ""
echo "========================================="
echo "  📦 Container Status"
echo "========================================="
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "========================================="
echo -e "${GREEN}✅ Update Complete!${NC}"
echo "========================================="
echo ""
echo "🌐 Access Points:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8080"
echo "   n8n:       http://localhost:5678"
echo "   pgAdmin:   http://localhost:5050"
echo ""
echo "📊 Container Status:"
docker-compose -f docker-compose.prod.yml ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "📝 Useful Commands:"
echo "   View logs:     docker-compose -f docker-compose.prod.yml logs -f"
echo "   Restart:       docker-compose -f docker-compose.prod.yml restart"
echo "   Stop all:      docker-compose -f docker-compose.prod.yml down"
echo "   Check health:  curl http://localhost:8080/health"
echo ""

if [ -d "$BACKUP_DIR" ] && [ -f "$BACKUP_DIR/kewalinvest_backup.sql" ]; then
    echo "💾 Backup Location:"
    echo "   $BACKUP_DIR/kewalinvest_backup.sql"
    echo ""
fi

echo "✅ Your data has been preserved!"
echo ""
