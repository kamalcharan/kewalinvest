#!/bin/bash

set -e  # Exit on any error

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "  KewalInvest - Clean Installation"
echo "========================================="
echo ""
echo "⚠️  This will create a FRESH installation"
echo "⚠️  All existing data will be replaced"
echo ""

# Confirmation prompt
read -p "Continue with clean installation? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Installation cancelled."
    exit 0
fi

echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ ERROR: .env file not found!${NC}"
    echo "Please create .env file with required variables."
    exit 1
fi

# Fix Windows line endings in .env file
echo "🔧 Converting .env line endings..."
sed -i 's/\r$//' .env 2>/dev/null || sed -i '' 's/\r$//' .env 2>/dev/null || true

# Load environment variables
set -a
source .env
set +a

echo "📥 Pulling images from Docker Hub..."
echo "   Registry: ${DOCKER_REGISTRY:-vikuna}"
echo "   Tag: ${IMAGE_TAG:-latest}"
echo ""

# Try to pull images
if ! docker-compose -f docker-compose.prod.yml pull; then
    echo ""
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}   ❌ Failed to Pull Docker Images${NC}"
    echo -e "${RED}=========================================${NC}"
    echo ""
    echo -e "${YELLOW}The Docker images don't exist on Docker Hub.${NC}"
    echo ""
    echo "This deployment package requires pre-built images from:"
    echo "  • ${DOCKER_REGISTRY:-vikuna}/kewalinvest-backend:${IMAGE_TAG:-latest}"
    echo "  • ${DOCKER_REGISTRY:-vikuna}/kewalinvest-frontend:${IMAGE_TAG:-latest}"
    echo ""
    echo "If you are the developer:"
    echo "  1. Run: ./build-and-push.sh"
    echo "  2. Then distribute this package to customers"
    echo ""
    echo "If you are a customer:"
    echo "  Contact support - the deployment package is incomplete"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Images pulled successfully${NC}"

echo ""
echo "🛑 Stopping existing containers (if any)..."
docker-compose -f docker-compose.prod.yml down

echo ""
echo "🗑️  Removing old volumes (if any)..."
docker volume rm kewalinvest_postgres_data 2>/dev/null || true
docker volume rm kewalinvest_pgadmin_data 2>/dev/null || true

echo ""
echo "🚀 Starting services with fresh volumes..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "⏳ Waiting for database initialization..."
sleep 10

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
    exit 1
fi

echo ""
echo "========================================="
echo "  📊 Database Setup (5 Steps)"
echo "========================================="

# Check if all required SQL files exist
REQUIRED_FILES=("database/01_init.sql" "database/02_tables.sql" "database/03_indexes_triggers.sql" "database/04_functions_views_policies.sql" "database/05_seed_data.sql")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ ERROR: Required file not found: $file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All SQL files found${NC}"
echo ""

# Step 1: Initialize and Clean Database
echo -e "${BLUE}Step 1/5: Initializing database (dropping old objects)...${NC}"
if docker exec -i kewalinvest_db psql -U kewal_admin kewalinvest < database/01_init.sql > /tmp/01_init.log 2>&1; then
    echo -e "${GREEN}   ✅ Database initialized successfully!${NC}"
else
    echo -e "${RED}   ❌ Initialization failed!${NC}"
    echo "   Check /tmp/01_init.log for details"
    cat /tmp/01_init.log
    exit 1
fi

# Step 2: Create Tables
echo ""
echo -e "${BLUE}Step 2/5: Creating tables...${NC}"
if docker exec -i kewalinvest_db psql -U kewal_admin kewalinvest < database/02_tables.sql > /tmp/02_tables.log 2>&1; then
    TABLE_COUNT=$(docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    echo -e "${GREEN}   ✅ Tables created successfully! (Total: $TABLE_COUNT)${NC}"
else
    echo -e "${RED}   ❌ Table creation failed!${NC}"
    echo "   Check /tmp/02_tables.log for details"
    cat /tmp/02_tables.log
    exit 1
fi

# Step 3: Create Indexes and Triggers
echo ""
echo -e "${BLUE}Step 3/5: Creating indexes and triggers...${NC}"
if docker exec -i kewalinvest_db psql -U kewal_admin kewalinvest < database/03_indexes_triggers.sql > /tmp/03_indexes_triggers.log 2>&1; then
    INDEX_COUNT=$(docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null | xargs)
    TRIGGER_COUNT=$(docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -t -c "SELECT COUNT(*) FROM pg_trigger WHERE tgisinternal = false;" 2>/dev/null | xargs)
    echo -e "${GREEN}   ✅ Indexes ($INDEX_COUNT) and triggers ($TRIGGER_COUNT) created successfully!${NC}"
else
    echo -e "${RED}   ❌ Index/Trigger creation failed!${NC}"
    echo "   Check /tmp/03_indexes_triggers.log for details"
    cat /tmp/03_indexes_triggers.log
    exit 1
fi

# Step 4: Create Functions, Views, and Policies
echo ""
echo -e "${BLUE}Step 4/5: Creating functions, views, and RLS policies...${NC}"
if docker exec -i kewalinvest_db psql -U kewal_admin kewalinvest < database/04_functions_views_policies.sql > /tmp/04_functions_views_policies.log 2>&1; then
    FUNCTION_COUNT=$(docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -t -c "SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public';" 2>/dev/null | xargs)
    VIEW_COUNT=$(docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public';" 2>/dev/null | xargs)
    POLICY_COUNT=$(docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -t -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';" 2>/dev/null | xargs)
    echo -e "${GREEN}   ✅ Functions ($FUNCTION_COUNT), views ($VIEW_COUNT), and policies ($POLICY_COUNT) created!${NC}"
else
    echo -e "${RED}   ❌ Function/View/Policy creation failed!${NC}"
    echo "   Check /tmp/04_functions_views_policies.log for details"
    cat /tmp/04_functions_views_policies.log
    exit 1
fi

# Step 5: Load Seed Data
echo ""
echo -e "${BLUE}Step 5/5: Loading seed data...${NC}"
if docker exec -i kewalinvest_db psql -U kewal_admin kewalinvest < database/05_seed_data.sql > /tmp/05_seed_data.log 2>&1; then
    echo -e "${GREEN}   ✅ Seed data loaded successfully!${NC}"
else
    echo -e "${RED}   ❌ Seed data loading failed!${NC}"
    echo "   Check /tmp/05_seed_data.log for details"
    cat /tmp/05_seed_data.log
    exit 1
fi

# Final Verification
echo ""
echo "========================================="
echo "  🔍 Final Database Verification"
echo "========================================="

# Get counts
TABLE_COUNT=$(docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")
N8N_TABLE_COUNT=$(docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'n8n';" 2>/dev/null | xargs || echo "0")
INDEX_COUNT=$(docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null | xargs || echo "0")
FUNCTION_COUNT=$(docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -t -c "SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public';" 2>/dev/null | xargs || echo "0")
VIEW_COUNT=$(docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")

echo "   📋 Tables (public): $TABLE_COUNT"
echo "   📋 Tables (n8n): $N8N_TABLE_COUNT"
echo "   🔍 Indexes: $INDEX_COUNT"
echo "   ⚙️  Functions: $FUNCTION_COUNT"
echo "   👁️  Views: $VIEW_COUNT"

# Validate minimum requirements
if [ "$TABLE_COUNT" -lt "20" ]; then
    echo ""
    echo -e "${RED}❌ Verification failed: Expected at least 20 tables, got $TABLE_COUNT${NC}"
    exit 1
fi

echo ""
echo "========================================="
echo "  📦 Container Status"
echo "========================================="
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "========================================="
echo -e "${GREEN}✅ Clean Installation Complete!${NC}"
echo "========================================="
echo ""
echo "🌐 Access Points:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8080"
echo "   n8n:       http://localhost:5678"
echo "   pgAdmin:   http://localhost:5050"
echo ""
echo "📊 Database Summary:"
echo "   Tables: $TABLE_COUNT (public) + $N8N_TABLE_COUNT (n8n)"
echo "   Indexes: $INDEX_COUNT"
echo "   Functions: $FUNCTION_COUNT"
echo "   Views: $VIEW_COUNT"
echo ""
echo "📝 Next Steps:"
echo "   1. Access pgAdmin: http://localhost:5050"
echo "      - Email: admin@kewalinvest.com"
echo "      - Password: (check .env PGADMIN_PASSWORD)"
echo "   2. Test API: curl http://localhost:8080/health"
echo "   3. Check logs: docker-compose -f docker-compose.prod.yml logs -f backend"
echo "   4. Load initial data through the application or API as needed"
echo ""
echo "💡 SQL Files Executed:"
echo "   ✓ 01_init.sql"
echo "   ✓ 02_tables.sql"
echo "   ✓ 03_indexes_triggers.sql"
echo "   ✓ 04_functions_views_policies.sql"
echo "   ✓ 05_seed_data.sql"
echo ""