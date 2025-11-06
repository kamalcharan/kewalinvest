#!/bin/bash

# ============================================================================
# KewalInvest - Configuration Wizard
# ============================================================================
# This script auto-generates secure passwords and creates .env file
# For completely seamless deployment experience
# ============================================================================

set -e  # Exit on any error

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Clear screen for better UX
clear

echo "============================================="
echo "  KewalInvest - Configuration Wizard"
echo "============================================="
echo ""
echo "This wizard will help you set up KewalInvest."
echo "All passwords will be auto-generated securely."
echo ""

# ============================================================================
# Helper Functions
# ============================================================================

# Generate random password
generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length 2>/dev/null || \
    LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*' </dev/urandom | head -c $length
}

# Generate exactly 32 character key
generate_32char_key() {
    openssl rand -hex 16 2>/dev/null || \
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32
}

# Prompt with default value
prompt_with_default() {
    local prompt_text=$1
    local default_value=$2
    local user_input

    read -p "$prompt_text [$default_value]: " user_input
    echo "${user_input:-$default_value}"
}

# Prompt for yes/no
prompt_yes_no() {
    local prompt_text=$1
    local default_value=${2:-yes}
    local user_input

    if [ "$default_value" = "yes" ]; then
        read -p "$prompt_text (Y/n): " user_input
        user_input=${user_input:-y}
    else
        read -p "$prompt_text (y/N): " user_input
        user_input=${user_input:-n}
    fi

    [[ "$user_input" =~ ^[Yy]$ ]]
}

# ============================================================================
# Check Prerequisites
# ============================================================================

echo -e "${BLUE}Checking prerequisites...${NC}"

# Check if .env already exists
if [ -f ".env" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Warning: .env file already exists!${NC}"
    if prompt_yes_no "Do you want to overwrite it?"; then
        echo -e "${YELLOW}Backing up existing .env to .env.backup...${NC}"
        cp .env .env.backup
    else
        echo -e "${RED}Configuration cancelled.${NC}"
        exit 0
    fi
fi

# Check if .env.example exists
if [ ! -f ".env.example" ]; then
    echo -e "${RED}❌ ERROR: .env.example not found!${NC}"
    echo "Please make sure you're in the client-deployment directory."
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# ============================================================================
# Gather Configuration
# ============================================================================

echo "============================================="
echo "  Configuration Setup"
echo "============================================="
echo ""

# Basic Configuration
echo -e "${CYAN}1. Basic Configuration${NC}"
echo "-------------------------------------------"

TIMEZONE=$(prompt_with_default "Enter your timezone" "Asia/Kolkata")
FRONTEND_PORT=$(prompt_with_default "Frontend port" "3000")
BACKEND_PORT=$(prompt_with_default "Backend API port" "8080")
PGADMIN_PORT=$(prompt_with_default "pgAdmin port" "5050")
N8N_PORT=$(prompt_with_default "n8n port" "5678")

echo ""

# Admin Credentials
echo -e "${CYAN}2. Administrator Access${NC}"
echo "-------------------------------------------"

PGADMIN_EMAIL=$(prompt_with_default "pgAdmin admin email" "admin@kewalinvest.com")

if prompt_yes_no "Would you like to set custom passwords?" "no"; then
    echo ""
    read -sp "Enter pgAdmin password: " PGADMIN_PASSWORD
    echo ""
    read -sp "Enter n8n admin password: " N8N_PASSWORD
    echo ""
else
    echo -e "${GREEN}Auto-generating secure passwords...${NC}"
    PGADMIN_PASSWORD=$(generate_password 16)
    N8N_PASSWORD=$(generate_password 16)
fi

echo ""

# Advanced Settings
if prompt_yes_no "Configure advanced settings (ports, resource limits)?" "no"; then
    echo ""
    echo -e "${CYAN}3. Advanced Configuration${NC}"
    echo "-------------------------------------------"

    DB_PORT=$(prompt_with_default "PostgreSQL port" "5432")
    REDIS_PORT=$(prompt_with_default "Redis port" "6379")

    BACKEND_MEMORY=$(prompt_with_default "Backend memory limit (e.g., 2G)" "2G")
    BACKEND_CPU=$(prompt_with_default "Backend CPU limit" "2")
else
    # Use defaults
    DB_PORT=5432
    REDIS_PORT=6379
    BACKEND_MEMORY=2G
    BACKEND_CPU=2
fi

echo ""

# ============================================================================
# Generate Secure Secrets
# ============================================================================

echo "============================================="
echo "  Generating Secure Credentials"
echo "============================================="
echo ""

echo -e "${BLUE}🔐 Generating secure passwords and encryption keys...${NC}"

# Database credentials
DB_PASSWORD=$(generate_password 32)

# Redis password
REDIS_PASSWORD=$(generate_password 32)

# JWT secrets
JWT_SECRET=$(generate_32char_key)
JWT_REFRESH_SECRET=$(generate_32char_key)

# Encryption key (exactly 32 characters)
ENCRYPTION_KEY=$(generate_32char_key)

# n8n encryption key
N8N_ENCRYPTION_KEY=$(generate_32char_key)

# n8n API key
N8N_API_KEY=$(generate_password 40)

echo -e "${GREEN}✅ All credentials generated successfully${NC}"
echo ""

# ============================================================================
# Create .env File
# ============================================================================

echo "============================================="
echo "  Creating .env Configuration"
echo "============================================="
echo ""

echo -e "${BLUE}Creating .env file...${NC}"

# Copy template and replace values
cat .env.example > .env

# Replace CHANGE_ME placeholders with generated values
sed -i.bak "s|CHANGE_ME_SECURE_PASSWORD_32_CHARS|$DB_PASSWORD|g" .env
sed -i.bak "s|CHANGE_ME_REDIS_PASSWORD|$REDIS_PASSWORD|g" .env
sed -i.bak "s|CHANGE_ME_JWT_SECRET_MIN_32_CHARACTERS_LONG|$JWT_SECRET|g" .env
sed -i.bak "s|CHANGE_ME_REFRESH_SECRET_MIN_32_CHARS|$JWT_REFRESH_SECRET|g" .env
sed -i.bak "s|CHANGE_ME_EXACTLY_32_CHARS_KEY!|$ENCRYPTION_KEY|g" .env
sed -i.bak "s|CHANGE_ME_N8N_PASSWORD|$N8N_PASSWORD|g" .env
sed -i.bak "s|CHANGE_ME_N8N_ENCRYPTION_KEY_32_CHARS|$N8N_ENCRYPTION_KEY|g" .env
sed -i.bak "s|CHANGE_ME_N8N_API_KEY|$N8N_API_KEY|g" .env
sed -i.bak "s|CHANGE_ME_PGADMIN_PASSWORD|$PGADMIN_PASSWORD|g" .env

# Update configuration values
sed -i.bak "s|^TIMEZONE=.*|TIMEZONE=$TIMEZONE|g" .env
sed -i.bak "s|^FRONTEND_PORT=.*|FRONTEND_PORT=$FRONTEND_PORT|g" .env
sed -i.bak "s|^BACKEND_PORT=.*|BACKEND_PORT=$BACKEND_PORT|g" .env
sed -i.bak "s|^PGADMIN_PORT=.*|PGADMIN_PORT=$PGADMIN_PORT|g" .env
sed -i.bak "s|^N8N_PORT=.*|N8N_PORT=$N8N_PORT|g" .env
sed -i.bak "s|^PGADMIN_EMAIL=.*|PGADMIN_EMAIL=$PGADMIN_EMAIL|g" .env
sed -i.bak "s|^DB_PORT=.*|DB_PORT=$DB_PORT|g" .env
sed -i.bak "s|^REDIS_PORT=.*|REDIS_PORT=$REDIS_PORT|g" .env
sed -i.bak "s|^BACKEND_MEMORY_LIMIT=.*|BACKEND_MEMORY_LIMIT=$BACKEND_MEMORY|g" .env
sed -i.bak "s|^BACKEND_CPU_LIMIT=.*|BACKEND_CPU_LIMIT=$BACKEND_CPU|g" .env

# Update URLs with correct ports
sed -i.bak "s|REACT_APP_API_URL=.*|REACT_APP_API_URL=http://localhost:$BACKEND_PORT|g" .env
sed -i.bak "s|REACT_APP_N8N_URL=.*|REACT_APP_N8N_URL=http://localhost:$N8N_PORT|g" .env
sed -i.bak "s|N8N_WEBHOOK_URL=.*|N8N_WEBHOOK_URL=http://localhost:$N8N_PORT/|g" .env
sed -i.bak "s|N8N_EDITOR_BASE_URL=.*|N8N_EDITOR_BASE_URL=http://localhost:$N8N_PORT/|g" .env

# Remove backup file
rm -f .env.bak

echo -e "${GREEN}✅ .env file created successfully${NC}"
echo ""

# ============================================================================
# Create Data Directories
# ============================================================================

echo -e "${BLUE}Creating data directories...${NC}"

mkdir -p data/{postgres,redis,n8n,n8n_files,UserFiles,pgadmin}

echo -e "${GREEN}✅ Data directories created${NC}"
echo ""

# ============================================================================
# Display Credentials
# ============================================================================

echo "============================================="
echo -e "${GREEN}✅ Configuration Complete!${NC}"
echo "============================================="
echo ""
echo -e "${CYAN}📋 Important Credentials (Save These!)${NC}"
echo "-------------------------------------------"
echo ""
echo -e "${YELLOW}Frontend:${NC}"
echo "  URL: http://localhost:$FRONTEND_PORT"
echo ""
echo -e "${YELLOW}Backend API:${NC}"
echo "  URL: http://localhost:$BACKEND_PORT"
echo "  Health: http://localhost:$BACKEND_PORT/health"
echo ""
echo -e "${YELLOW}Database (PostgreSQL):${NC}"
echo "  Host: localhost"
echo "  Port: $DB_PORT"
echo "  Database: kewalinvest"
echo "  User: kewal_admin"
echo "  Password: $DB_PASSWORD"
echo ""
echo -e "${YELLOW}pgAdmin:${NC}"
echo "  URL: http://localhost:$PGADMIN_PORT"
echo "  Email: $PGADMIN_EMAIL"
echo "  Password: $PGADMIN_PASSWORD"
echo ""
echo -e "${YELLOW}n8n (Workflow Automation):${NC}"
echo "  URL: http://localhost:$N8N_PORT"
echo "  Username: admin"
echo "  Password: $N8N_PASSWORD"
echo ""
echo "-------------------------------------------"
echo ""

# Save credentials to a file
cat > .credentials.txt <<EOF
KewalInvest - Installation Credentials
Generated: $(date)
========================================

Frontend:
  URL: http://localhost:$FRONTEND_PORT

Backend API:
  URL: http://localhost:$BACKEND_PORT

Database (PostgreSQL):
  Host: localhost
  Port: $DB_PORT
  Database: kewalinvest
  User: kewal_admin
  Password: $DB_PASSWORD

pgAdmin:
  URL: http://localhost:$PGADMIN_PORT
  Email: $PGADMIN_EMAIL
  Password: $PGADMIN_PASSWORD

n8n (Workflow Automation):
  URL: http://localhost:$N8N_PORT
  Username: admin
  Password: $N8N_PASSWORD

IMPORTANT:
- Keep this file secure
- Do not share passwords
- Backup .env file safely
EOF

echo -e "${GREEN}💾 Credentials saved to: .credentials.txt${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT SECURITY NOTES:${NC}"
echo "  1. Keep .credentials.txt in a secure location"
echo "  2. Never commit .env or .credentials.txt to git"
echo "  3. Create a backup of .env file"
echo ""
echo "============================================="
echo "  Next Steps"
echo "============================================="
echo ""
echo "  1. Review .env file (optional)"
echo "  2. Run: ./deploy.sh to start installation"
echo "  3. Access application at http://localhost:$FRONTEND_PORT"
echo ""
echo -e "${CYAN}Ready to deploy!${NC} 🚀"
echo ""
