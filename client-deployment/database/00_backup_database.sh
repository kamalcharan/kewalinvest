#!/bin/bash
# ============================================================================
# File: 00_backup_database.sh
# Description: Create database backup BEFORE running any migrations/fixes
# Usage: ./00_backup_database.sh [database_name]
# ============================================================================
#
# ALWAYS RUN THIS BEFORE:
#   - Running any migration scripts
#   - Running schema sync scripts
#   - Running any fix scripts
#
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${1:-${DB_NAME:-kewalinvest}}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

echo ""
echo "=============================================="
echo "  KEWAL INVEST - DATABASE BACKUP UTILITY"
echo "=============================================="
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Database: $DB_NAME"
echo "  Host:     $DB_HOST"
echo "  Port:     $DB_PORT"
echo "  User:     $DB_USER"
echo "  Backup:   $BACKUP_FILE_GZ"
echo ""

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}ERROR: pg_dump command not found${NC}"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Test connection
echo -e "${YELLOW}Testing database connection...${NC}"
if ! PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
    echo -e "${RED}ERROR: Cannot connect to database${NC}"
    echo ""
    echo "Please set environment variables:"
    echo "  export DB_HOST=localhost"
    echo "  export DB_PORT=5432"
    echo "  export DB_NAME=kewalinvest"
    echo "  export DB_USER=postgres"
    echo "  export DB_PASSWORD=yourpassword"
    exit 1
fi
echo -e "${GREEN}Connection successful${NC}"
echo ""

# Get database size
DB_SIZE=$(PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
echo -e "${YELLOW}Database size: ${NC}$DB_SIZE"

# Count tables
TABLE_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo -e "${YELLOW}Tables: ${NC}$TABLE_COUNT"
echo ""

# Create backup
echo -e "${YELLOW}Creating backup...${NC}"
echo "This may take a few minutes for large databases."
echo ""

if PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-privileges \
    --verbose \
    2>&1 | gzip > "$BACKUP_FILE_GZ"; then

    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE_GZ" | awk '{print $5}')

    echo ""
    echo -e "${GREEN}=============================================="
    echo "  BACKUP COMPLETED SUCCESSFULLY"
    echo "==============================================${NC}"
    echo ""
    echo "  Backup file: $BACKUP_FILE_GZ"
    echo "  Size:        $BACKUP_SIZE"
    echo ""
    echo -e "${YELLOW}To restore this backup:${NC}"
    echo ""
    echo "  # Stop your application first!"
    echo "  gunzip -c $BACKUP_FILE_GZ | psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    echo ""
    echo -e "${GREEN}You can now safely run migrations/fixes.${NC}"
    echo ""
else
    echo -e "${RED}ERROR: Backup failed${NC}"
    rm -f "$BACKUP_FILE_GZ"
    exit 1
fi

# List recent backups
echo "Recent backups in $BACKUP_DIR:"
ls -lht "$BACKUP_DIR"/*.gz 2>/dev/null | head -5 || echo "  (no backups found)"
echo ""
