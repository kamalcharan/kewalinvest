#!/bin/bash

# ============================================================================
# Kewalinvest Database Rebuild Script
# This script will rebuild the PostgreSQL database with the correct schema
# ============================================================================

echo "============================================================================"
echo "Kewalinvest Database Rebuild"
echo "============================================================================"
echo ""
echo "This will:"
echo "  1. Stop all containers"
echo "  2. Remove the postgres volume (ALL DATA WILL BE LOST)"
echo "  3. Restart containers with fresh database"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Rebuild cancelled."
    exit 0
fi

echo ""
echo "Step 1: Stopping containers..."
docker compose down

echo ""
echo "Step 2: Removing postgres volume..."
docker volume rm kewalinvest_postgres_data

echo ""
echo "Step 3: Starting containers with fresh database..."
docker compose up -d postgres

echo ""
echo "Waiting for database to initialize (30 seconds)..."
sleep 30

echo ""
echo "Step 4: Checking database logs..."
docker compose logs postgres | tail -20

echo ""
echo "Step 5: Starting remaining services..."
docker compose up -d

echo ""
echo "============================================================================"
echo "Database rebuild complete!"
echo "============================================================================"
echo ""
echo "You can verify the database with:"
echo "  docker compose exec postgres psql -U kewal_admin -d kewalinvest -c \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';\""
echo ""
echo "To check if the views exist:"
echo "  docker compose exec postgres psql -U kewal_admin -d kewalinvest -c \"SELECT viewname FROM pg_views WHERE schemaname='public';\""
echo ""
