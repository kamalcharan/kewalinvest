#!/bin/bash

# ============================================================================
# KewalInvest - Smart Migration Script
# Automatically detects and runs missing migrations
# Tracks applied migrations in t_migrations table
# ============================================================================

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}  KewalInvest - Smart Database Migrations${NC}"
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
# Helper Functions
# ============================================================================

# Execute SQL and return result
run_sql() {
    docker exec -i ${INSTANCE_NAME}_db psql -U ${DB_USER} -d ${DB_NAME} -t -A -c "$1" 2>/dev/null
}

# Execute SQL file
run_sql_file() {
    local file=$1
    docker exec -i ${INSTANCE_NAME}_db psql -U ${DB_USER} -d ${DB_NAME} < "$file" 2>&1
}

# Get MD5 checksum of file
get_checksum() {
    md5sum "$1" 2>/dev/null | cut -d' ' -f1 || md5 -q "$1" 2>/dev/null || echo "unknown"
}

# Extract version number from filename (e.g., "023" from "023_alert_system.sql")
get_version() {
    local filename=$(basename "$1")
    echo "$filename" | grep -oE '^[0-9]+' | head -1
}

# Extract name from filename (e.g., "alert_system_enhancements" from "023_alert_system_enhancements.sql")
get_migration_name() {
    local filename=$(basename "$1" .sql)
    echo "$filename" | sed 's/^[0-9]*_//' | tr '_' ' ' | sed 's/.*/\u&/'
}

# ============================================================================
# Check Database Connection
# ============================================================================
echo -e "${BLUE}[1/5] Checking Database Connection${NC}"
echo "-------------------------------------------"

if ! docker exec ${INSTANCE_NAME}_db pg_isready -U ${DB_USER} -d ${DB_NAME} > /dev/null 2>&1; then
    echo -e "${RED}[X] ERROR: Database is not running!${NC}"
    echo "Start services with: docker-compose -f docker-compose.prod.yml up -d"
    exit 1
fi

echo -e "${GREEN}[OK] Database is running${NC}"
echo ""

# ============================================================================
# Ensure Migration Tracking Table Exists
# ============================================================================
echo -e "${BLUE}[2/5] Checking Migration Tracking Table${NC}"
echo "-------------------------------------------"

TABLE_EXISTS=$(run_sql "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 't_migrations');")

if [ "$TABLE_EXISTS" != "t" ]; then
    echo -e "${YELLOW}[!] Migration tracking table not found. Creating...${NC}"

    if [ -f "database/00_migrations_tracking.sql" ]; then
        run_sql_file "database/00_migrations_tracking.sql" > /dev/null 2>&1
        echo -e "${GREEN}[OK] Created t_migrations table${NC}"
    else
        echo -e "${RED}[X] ERROR: database/00_migrations_tracking.sql not found!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}[OK] Migration tracking table exists${NC}"
fi

# Get current DB version
CURRENT_VERSION=$(run_sql "SELECT COALESCE(MAX(version), '000') FROM t_migrations WHERE status = 'success';")
echo -e "   Current DB Version: ${BOLD}${CURRENT_VERSION}${NC}"
echo ""

# ============================================================================
# Scan Available Migrations
# ============================================================================
echo -e "${BLUE}[3/5] Scanning Available Migrations${NC}"
echo "-------------------------------------------"

MIGRATIONS_DIR="database/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    # Fallback to migrations/ if database/migrations doesn't exist
    MIGRATIONS_DIR="migrations"
fi

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${YELLOW}[!] No migrations folder found${NC}"
    echo "   Checked: database/migrations/ and migrations/"
    exit 0
fi

# Get list of migration files (sorted)
MIGRATION_FILES=($(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort))

if [ ${#MIGRATION_FILES[@]} -eq 0 ]; then
    echo -e "${YELLOW}[!] No migration files found in $MIGRATIONS_DIR/${NC}"
    exit 0
fi

echo "   Found ${#MIGRATION_FILES[@]} migration files"
echo ""

# ============================================================================
# Determine Missing Migrations
# ============================================================================
echo -e "${BLUE}[4/5] Analyzing Migration Status${NC}"
echo "-------------------------------------------"

declare -a PENDING_MIGRATIONS
declare -a APPLIED_MIGRATIONS

for file in "${MIGRATION_FILES[@]}"; do
    version=$(get_version "$file")
    filename=$(basename "$file")

    # Skip if no version number found
    if [ -z "$version" ]; then
        continue
    fi

    # Skip 00_migrations_tracking.sql (always applied first)
    if [ "$version" == "00" ] || [ "$version" == "0" ]; then
        continue
    fi

    # Check if already applied
    IS_APPLIED=$(run_sql "SELECT EXISTS(SELECT 1 FROM t_migrations WHERE version = '$version' AND status = 'success');")

    if [ "$IS_APPLIED" == "t" ]; then
        APPLIED_MIGRATIONS+=("$filename")
        echo -e "   ${GREEN}✓${NC} $filename (applied)"
    else
        PENDING_MIGRATIONS+=("$file")
        echo -e "   ${YELLOW}○${NC} $filename (pending)"
    fi
done

echo ""
echo "   Applied: ${#APPLIED_MIGRATIONS[@]}"
echo "   Pending: ${#PENDING_MIGRATIONS[@]}"
echo ""

# ============================================================================
# Run Pending Migrations
# ============================================================================
if [ ${#PENDING_MIGRATIONS[@]} -eq 0 ]; then
    echo -e "${GREEN}=============================================${NC}"
    echo -e "${GREEN}  [OK] Database is up to date!${NC}"
    echo -e "${GREEN}  Current Version: ${CURRENT_VERSION}${NC}"
    echo -e "${GREEN}=============================================${NC}"
    exit 0
fi

echo -e "${BLUE}[5/5] Running Pending Migrations${NC}"
echo "-------------------------------------------"

# Ask for confirmation
echo -e "${YELLOW}The following migrations will be applied:${NC}"
for file in "${PENDING_MIGRATIONS[@]}"; do
    echo "   - $(basename "$file")"
done
echo ""

read -p "Proceed? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""

# Run each pending migration
SUCCESS_COUNT=0
FAIL_COUNT=0

for file in "${PENDING_MIGRATIONS[@]}"; do
    version=$(get_version "$file")
    filename=$(basename "$file")
    name=$(get_migration_name "$file")
    checksum=$(get_checksum "$file")

    echo -e "${CYAN}Running: $filename${NC}"

    # Record start time
    START_TIME=$(date +%s%3N)

    # Run migration
    OUTPUT=$(run_sql_file "$file" 2>&1)
    EXIT_CODE=$?

    # Calculate execution time
    END_TIME=$(date +%s%3N)
    EXEC_TIME=$((END_TIME - START_TIME))

    if [ $EXIT_CODE -eq 0 ]; then
        # Success - record in t_migrations
        run_sql "INSERT INTO t_migrations (version, filename, name, execution_time_ms, status, checksum)
                 VALUES ('$version', '$filename', '$name', $EXEC_TIME, 'success', '$checksum')
                 ON CONFLICT (version) DO UPDATE SET
                     status = 'success',
                     applied_at = CURRENT_TIMESTAMP,
                     execution_time_ms = $EXEC_TIME,
                     error_message = NULL;" > /dev/null 2>&1

        echo -e "   ${GREEN}[OK]${NC} Completed in ${EXEC_TIME}ms"
        ((SUCCESS_COUNT++))
    else
        # Failed - record error
        ESCAPED_OUTPUT=$(echo "$OUTPUT" | head -c 500 | sed "s/'/''/g")
        run_sql "INSERT INTO t_migrations (version, filename, name, execution_time_ms, status, error_message, checksum)
                 VALUES ('$version', '$filename', '$name', $EXEC_TIME, 'failed', '$ESCAPED_OUTPUT', '$checksum')
                 ON CONFLICT (version) DO UPDATE SET
                     status = 'failed',
                     applied_at = CURRENT_TIMESTAMP,
                     execution_time_ms = $EXEC_TIME,
                     error_message = '$ESCAPED_OUTPUT';" > /dev/null 2>&1

        echo -e "   ${RED}[FAILED]${NC} $filename"
        echo -e "   Error: $(echo "$OUTPUT" | head -3)"
        ((FAIL_COUNT++))

        # Stop on first failure
        echo -e "${RED}[X] Migration failed. Stopping.${NC}"
        break
    fi
done

echo ""

# ============================================================================
# Summary
# ============================================================================
NEW_VERSION=$(run_sql "SELECT COALESCE(MAX(version), '000') FROM t_migrations WHERE status = 'success';")

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}=============================================${NC}"
    echo -e "${GREEN}  [OK] All Migrations Completed!${NC}"
    echo -e "${GREEN}=============================================${NC}"
else
    echo -e "${YELLOW}=============================================${NC}"
    echo -e "${YELLOW}  [!] Migrations Completed with Errors${NC}"
    echo -e "${YELLOW}=============================================${NC}"
fi

echo ""
echo "   Previous Version: ${CURRENT_VERSION}"
echo "   Current Version:  ${NEW_VERSION}"
echo "   Applied: ${SUCCESS_COUNT}"
echo "   Failed:  ${FAIL_COUNT}"
echo ""

# Show migration history
echo -e "${BLUE}Migration History (last 10):${NC}"
run_sql "SELECT version || ' | ' || filename || ' | ' || status || ' | ' || TO_CHAR(applied_at, 'YYYY-MM-DD HH24:MI')
         FROM t_migrations
         ORDER BY version DESC
         LIMIT 10;"
echo ""
