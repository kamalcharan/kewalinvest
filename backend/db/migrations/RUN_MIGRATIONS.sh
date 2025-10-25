#!/bin/bash

# Run duplicate detection database migrations
# Usage: ./RUN_MIGRATIONS.sh

set -e  # Exit on error

echo "🔧 Running Duplicate Detection Database Migrations..."
echo ""

# Get database connection details from environment or use defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-kewalinvest}"
DB_USER="${DB_USER:-postgres}"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql command not found. Please install PostgreSQL client."
    exit 1
fi

# Test database connection
echo "📡 Testing database connection..."
if ! PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
    echo "❌ Error: Cannot connect to database. Please check your credentials."
    echo "   Host: $DB_HOST"
    echo "   Port: $DB_PORT"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"
    exit 1
fi

echo "✅ Database connection successful"
echo ""

# Run migration 001
echo "🔹 Running migration 001: Add duplicate detection columns..."
if PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "001_add_duplicate_detection_columns.sql"; then
    echo "✅ Migration 001 completed successfully"
else
    echo "❌ Migration 001 failed"
    exit 1
fi
echo ""

# Run migration 002
echo "🔹 Running migration 002: Create duplicate check functions..."
if PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "002_create_duplicate_check_functions.sql"; then
    echo "✅ Migration 002 completed successfully"
else
    echo "❌ Migration 002 failed"
    exit 1
fi
echo ""

# Verify migrations
echo "🔍 Verifying migrations..."
echo ""

echo "Checking columns..."
COLUMN_CHECK=$(PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_name = 't_import_sessions'
    AND column_name IN ('file_hash', 'current_stage', 'duplicate_check_result', 'duplicate_classification');
")

if [ "$COLUMN_CHECK" -eq 4 ]; then
    echo "✅ All 4 columns added successfully"
else
    echo "⚠️  Warning: Expected 4 columns, found $COLUMN_CHECK"
fi

echo ""
echo "Checking functions..."
FUNCTION_CHECK=$(PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*)
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('check_filename_duplicate', 'check_session_duplicate_percentage');
")

if [ "$FUNCTION_CHECK" -eq 2 ]; then
    echo "✅ All 2 functions created successfully"
else
    echo "⚠️  Warning: Expected 2 functions, found $FUNCTION_CHECK"
fi

echo ""
echo "🎉 All migrations completed successfully!"
echo ""
echo "Next steps:"
echo "1. Restart your backend server: npm start"
echo "2. Test the duplicate detection features"
echo ""
