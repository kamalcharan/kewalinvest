#!/bin/bash
# ============================================================================
# File: 00_restore_database.sh
# Description: Restore database from backup
# Usage: ./00_restore_database.sh <backup_file.sql.gz>
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-kewalinvest}"
DB_USER="${DB_USER:-postgres}"

BACKUP_FILE="$1"

echo ""
echo "=============================================="
echo "  KEWAL INVEST - DATABASE RESTORE UTILITY"
echo "=============================================="
echo ""

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}ERROR: No backup file specified${NC}"
    echo ""
    echo "Usage: ./00_restore_database.sh <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lht ./backups/*.gz 2>/dev/null | head -10 || echo "  (no backups found in ./backups/)"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}ERROR: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Configuration:${NC}"
echo "  Database:    $DB_NAME"
echo "  Host:        $DB_HOST"
echo "  Backup file: $BACKUP_FILE"
echo ""

echo -e "${RED}WARNING: This will REPLACE ALL DATA in database '$DB_NAME'${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Restoring database...${NC}"

# Drop and recreate database
echo "Dropping existing database..."
PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"

echo "Creating fresh database..."
PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME};"

echo "Restoring from backup..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"

echo ""
echo -e "${GREEN}=============================================="
echo "  RESTORE COMPLETED SUCCESSFULLY"
echo "==============================================${NC}"
echo ""
echo "Database '$DB_NAME' has been restored from:"
echo "  $BACKUP_FILE"
echo ""
echo "Please restart your application."
echo ""
