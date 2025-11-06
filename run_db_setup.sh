#!/bin/bash
set -e

echo "============================================"
echo "Running Database Setup Scripts"
echo "============================================"

# Step 1: Create database if it doesn't exist
echo ""
echo "Step 1: Creating kewalinvest database..."
docker compose exec -T postgres psql -U kewal_admin -c "CREATE DATABASE kewalinvest;" 2>/dev/null || echo "Database already exists, continuing..."

# Step 2: Run distribution scripts in order
echo ""
echo "Step 2: Running initialization scripts..."

echo "  → Running 01_init.sql..."
docker compose exec -T postgres psql -U kewal_admin -d kewalinvest < "backend/db/ditribution scripts/01_init.sql"

echo "  → Running 02_tables.sql..."
docker compose exec -T postgres psql -U kewal_admin -d kewalinvest < "backend/db/ditribution scripts/02_tables.sql"

echo "  → Running 03_indexes_triggers.sql..."
docker compose exec -T postgres psql -U kewal_admin -d kewalinvest < "backend/db/ditribution scripts/03_indexes_triggers.sql"

echo "  → Running 04_functions_views_policies.sql..."
docker compose exec -T postgres psql -U kewal_admin -d kewalinvest < "backend/db/ditribution scripts/04_functions_views_policies.sql"

echo "  → Running 05_seed_data.sql..."
docker compose exec -T postgres psql -U kewal_admin -d kewalinvest < "backend/db/ditribution scripts/05_seed_data.sql"

echo "  → Running 06_fix_meetings_table.sql..."
docker compose exec -T postgres psql -U kewal_admin -d kewalinvest < "backend/db/ditribution scripts/06_fix_meetings_table.sql"

echo ""
echo "============================================"
echo "Database setup complete!"
echo "============================================"
echo ""
echo "Verifying setup..."
docker compose exec -T postgres psql -U kewal_admin -d kewalinvest -c "SELECT viewname FROM pg_views WHERE schemaname='public' AND viewname LIKE 'v_import%';"

echo ""
echo "✅ Done! Start all services with: docker compose up -d"
