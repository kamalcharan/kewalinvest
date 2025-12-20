#!/bin/bash

# ============================================================================
# KewalInvest - Configuration Script
# Creates .env file with user-provided values
# ============================================================================

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear

echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}  KewalInvest - Configuration Wizard${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""
echo "This wizard will create your .env configuration file."
echo "Please enter all required values."
echo ""

# ============================================================================
# Check if .env already exists
# ============================================================================
if [ -f ".env" ]; then
    echo -e "${YELLOW}[!] Warning: .env file already exists!${NC}"
    read -p "Overwrite existing .env? (yes/no): " OVERWRITE
    if [ "$OVERWRITE" != "yes" ]; then
        echo -e "${RED}Configuration cancelled.${NC}"
        exit 0
    fi
    cp .env .env.backup
    echo -e "${GREEN}[OK] Backup created: .env.backup${NC}"
    echo ""
fi

# ============================================================================
# Helper function to generate random string
# ============================================================================
generate_key() {
    local length=${1:-32}
    cat /dev/urandom | tr -dc 'A-Za-z0-9' | head -c $length 2>/dev/null || \
    openssl rand -hex 16 2>/dev/null || \
    date +%s%N | sha256sum | head -c $length
}

# ============================================================================
# Instance Configuration
# ============================================================================
echo -e "${BLUE}[1/6] Instance Configuration${NC}"
echo "-------------------------------------------"

read -p "Instance Name (e.g., kewalinvest, vikunaInvest): " INSTANCE_NAME
while [ -z "$INSTANCE_NAME" ]; do
    echo -e "${RED}Instance name cannot be empty${NC}"
    read -p "Instance Name: " INSTANCE_NAME
done

read -p "Volume Prefix (e.g., kewalinvest_prod): " VOLUME_PREFIX
while [ -z "$VOLUME_PREFIX" ]; do
    echo -e "${RED}Volume prefix cannot be empty${NC}"
    read -p "Volume Prefix: " VOLUME_PREFIX
done

echo ""

# ============================================================================
# Docker Configuration
# ============================================================================
echo -e "${BLUE}[2/6] Docker Configuration${NC}"
echo "-------------------------------------------"

# Docker registry is fixed - images are hosted on vikuna
DOCKER_REGISTRY="vikuna"
echo "Docker Registry: ${DOCKER_REGISTRY} (fixed)"

read -p "Image Tag (e.g., latest, v1.0): " IMAGE_TAG
while [ -z "$IMAGE_TAG" ]; do
    echo -e "${RED}Image tag cannot be empty${NC}"
    read -p "Image Tag: " IMAGE_TAG
done

echo ""

# ============================================================================
# Database Configuration
# ============================================================================
echo -e "${BLUE}[3/6] Database Configuration${NC}"
echo "-------------------------------------------"

read -p "Database Name (e.g., kewalinvest): " DB_NAME
while [ -z "$DB_NAME" ]; do
    echo -e "${RED}Database name cannot be empty${NC}"
    read -p "Database Name: " DB_NAME
done

read -p "Database User (e.g., kewal_admin): " DB_USER
while [ -z "$DB_USER" ]; do
    echo -e "${RED}Database user cannot be empty${NC}"
    read -p "Database User: " DB_USER
done

read -sp "Database Password: " DB_PASSWORD
echo ""
while [ -z "$DB_PASSWORD" ]; do
    echo -e "${RED}Database password cannot be empty${NC}"
    read -sp "Database Password: " DB_PASSWORD
    echo ""
done

read -p "Database Port (e.g., 5432): " DB_PORT
while [ -z "$DB_PORT" ]; do
    echo -e "${RED}Database port cannot be empty${NC}"
    read -p "Database Port: " DB_PORT
done

echo ""

# ============================================================================
# pgAdmin Configuration
# ============================================================================
echo -e "${BLUE}[4/6] pgAdmin Configuration${NC}"
echo "-------------------------------------------"

read -p "pgAdmin Email (e.g., admin@company.com): " PGADMIN_EMAIL
while [ -z "$PGADMIN_EMAIL" ]; do
    echo -e "${RED}pgAdmin email cannot be empty${NC}"
    read -p "pgAdmin Email: " PGADMIN_EMAIL
done

read -sp "pgAdmin Password: " PGADMIN_PASSWORD
echo ""
while [ -z "$PGADMIN_PASSWORD" ]; do
    echo -e "${RED}pgAdmin password cannot be empty${NC}"
    read -sp "pgAdmin Password: " PGADMIN_PASSWORD
    echo ""
done

read -p "pgAdmin Port (e.g., 5050): " PGADMIN_PORT
while [ -z "$PGADMIN_PORT" ]; do
    echo -e "${RED}pgAdmin port cannot be empty${NC}"
    read -p "pgAdmin Port: " PGADMIN_PORT
done

echo ""

# ============================================================================
# Application Ports
# ============================================================================
echo -e "${BLUE}[5/6] Application Ports${NC}"
echo "-------------------------------------------"

read -p "Frontend Port (e.g., 3000): " FRONTEND_PORT
while [ -z "$FRONTEND_PORT" ]; do
    echo -e "${RED}Frontend port cannot be empty${NC}"
    read -p "Frontend Port: " FRONTEND_PORT
done

read -p "Backend Port (e.g., 8080): " BACKEND_PORT
while [ -z "$BACKEND_PORT" ]; do
    echo -e "${RED}Backend port cannot be empty${NC}"
    read -p "Backend Port: " BACKEND_PORT
done

echo ""

# ============================================================================
# Security & Other Settings
# ============================================================================
echo -e "${BLUE}[6/6] Security & Other Settings${NC}"
echo "-------------------------------------------"

read -p "Timezone (e.g., Asia/Kolkata): " TIMEZONE
while [ -z "$TIMEZONE" ]; do
    echo -e "${RED}Timezone cannot be empty${NC}"
    read -p "Timezone: " TIMEZONE
done

echo ""
echo -e "${CYAN}Generating secure keys...${NC}"

JWT_SECRET=$(generate_key 32)
JWT_REFRESH_SECRET=$(generate_key 32)
ENCRYPTION_KEY=$(generate_key 32)

echo -e "${GREEN}[OK] Secure keys generated${NC}"
echo ""

# ============================================================================
# Create .env file
# ============================================================================
echo -e "${BLUE}Creating .env file...${NC}"

cat > .env << EOF
# ============================================================================
# KewalInvest - Environment Configuration
# Generated by configure.sh on $(date)
# ============================================================================

# Instance Configuration
INSTANCE_NAME=${INSTANCE_NAME}
VOLUME_PREFIX=${VOLUME_PREFIX}

# Docker Configuration
DOCKER_REGISTRY=${DOCKER_REGISTRY}
IMAGE_TAG=${IMAGE_TAG}

# Database Configuration
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_PORT=${DB_PORT}

# pgAdmin Configuration
PGADMIN_EMAIL=${PGADMIN_EMAIL}
PGADMIN_PASSWORD=${PGADMIN_PASSWORD}
PGADMIN_PORT=${PGADMIN_PORT}

# Application Ports
FRONTEND_PORT=${FRONTEND_PORT}
BACKEND_PORT=${BACKEND_PORT}

# Security Keys (32 characters each)
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Timezone
TIMEZONE=${TIMEZONE}

# CORS Configuration
CORS_ORIGIN=http://localhost:${FRONTEND_PORT}
EOF

echo -e "${GREEN}[OK] .env file created${NC}"
echo ""

# ============================================================================
# Create credentials file
# ============================================================================
cat > .credentials.txt << EOF
KewalInvest - Installation Credentials
Generated: $(date)
========================================

Instance: ${INSTANCE_NAME}

Frontend:
  URL: http://localhost:${FRONTEND_PORT}

Backend API:
  URL: http://localhost:${BACKEND_PORT}

Database (PostgreSQL):
  Host: localhost
  Port: ${DB_PORT}
  Database: ${DB_NAME}
  User: ${DB_USER}
  Password: ${DB_PASSWORD}

pgAdmin:
  URL: http://localhost:${PGADMIN_PORT}
  Email: ${PGADMIN_EMAIL}
  Password: ${PGADMIN_PASSWORD}

IMPORTANT:
- Keep this file secure
- Do not share passwords
- Backup .env file safely
EOF

echo -e "${GREEN}[OK] Credentials saved to .credentials.txt${NC}"
echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Configuration Complete!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "Instance:    ${INSTANCE_NAME}"
echo "Registry:    ${DOCKER_REGISTRY}"
echo "Image Tag:   ${IMAGE_TAG}"
echo ""
echo "Ports:"
echo "  Frontend:  ${FRONTEND_PORT}"
echo "  Backend:   ${BACKEND_PORT}"
echo "  Database:  ${DB_PORT}"
echo "  pgAdmin:   ${PGADMIN_PORT}"
echo ""
echo -e "${YELLOW}Next step: Run ./deploy.sh to install${NC}"
echo ""
