#!/bin/bash

# ============================================================================
# KewalInvest - Migration Script
# Runs database migrations from migrations/ folder
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
echo -e "${CYAN}  KewalInvest - Database Migrations${NC}"
echo -e "${CYAN}=============================================${NC}"
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
echo "   Database: ${DB_NAME}"
echo "   User: ${DB_USER}"
echo ""

# ============================================================================
# Check Database Connection
# ============================================================================
echo -e "${BLUE}Checking Database Connection${NC}"
echo "-------------------------------------------"

if ! docker exec ${INSTANCE_NAME}_db pg_isready -U ${DB_USER} -d ${DB_NAME} > /dev/null 2>&1; then
    echo -e "${RED}[X] ERROR: Database is not running!${NC}"
    echo "Start services with: docker-compose -f docker-compose.prod.yml up -d"
    exit 1
fi

echo -e "${GREEN}[OK] Database is running${NC}"
echo ""

# ============================================================================
# List Available Migrations
# ============================================================================
echo -e "${BLUE}Available Migrations${NC}"
echo "-------------------------------------------"

if [ ! -d "migrations" ]; then
    echo -e "${YELLOW}[!] No migrations folder found${NC}"
    exit 0
fi

MIGRATIONS=(migrations/*.sql)

if [ ${#MIGRATIONS[@]} -eq 0 ] || [ ! -f "${MIGRATIONS[0]}" ]; then
    echo -e "${YELLOW}[!] No migration files found in migrations/${NC}"
    exit 0
fi

echo ""
echo "Found migrations:"
i=1
for migration in "${MIGRATIONS[@]}"; do
    if [ -f "$migration" ]; then
        migration_name=$(basename "$migration")
        echo "   $i. $migration_name"
        ((i++))
    fi
done

echo ""
echo "   A. Run ALL migrations"
echo "   Q. Quit"
echo ""

# ============================================================================
# Select Migration
# ============================================================================
read -p "Enter choice (1-$((i-1)), A, or Q): " CHOICE

if [[ "$CHOICE" =~ ^[Qq]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""

# ============================================================================
# Run Migrations
# ============================================================================
run_migration() {
    local file=$1
    local name=$(basename "$file")
    
    echo -e "${CYAN}Running: $name${NC}"
    
    if docker exec -i ${INSTANCE_NAME}_db psql -U ${DB_USER} -d ${DB_NAME} < "$file" > /tmp/migration_${name}.log 2>&1; then
        echo -e "${GREEN}   [OK] $name completed${NC}"
        return 0
    else
        echo -e "${YELLOW}   [!] $name completed with warnings${NC}"
        echo "   Log: /tmp/migration_${name}.log"
        return 0
    fi
}

if [[ "$CHOICE" =~ ^[Aa]$ ]]; then
    # Run all migrations
    echo -e "${BLUE}Running ALL Migrations${NC}"
    echo "-------------------------------------------"
    
    for migration in "${MIGRATIONS[@]}"; do
        if [ -f "$migration" ]; then
            run_migration "$migration"
        fi
    done
else
    # Run single migration
    if [[ "$CHOICE" =~ ^[0-9]+$ ]] && [ "$CHOICE" -ge 1 ] && [ "$CHOICE" -lt "$i" ]; then
        index=$((CHOICE - 1))
        selected="${MIGRATIONS[$index]}"
        
        if [ -f "$selected" ]; then
            echo -e "${BLUE}Running Selected Migration${NC}"
            echo "-------------------------------------------"
            run_migration "$selected"
        else
            echo -e "${RED}[X] Invalid selection${NC}"
            exit 1
        fi
    else
        echo -e "${RED}[X] Invalid selection${NC}"
        exit 1
    fi
fi

echo ""

# ============================================================================
# Complete
# ============================================================================
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  [OK] Migrations Complete!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

# Show table count
TABLE_COUNT=$(docker exec ${INSTANCE_NAME}_db psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")
echo "Database now has $TABLE_COUNT tables."
echo ""
