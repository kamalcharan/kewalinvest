#!/bin/bash

# ============================================================================
# Build and Push Docker Images to Docker Hub
# Run this BEFORE distributing to customers
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "  🐳 KewalInvest Docker Build & Push"
echo "========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please run ./configure.sh first to create the .env file"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Get registry and tag
REGISTRY="${DOCKER_REGISTRY:-vikuna}"
TAG="${IMAGE_TAG:-latest}"

echo -e "${BLUE}Docker Registry: ${NC}${REGISTRY}"
echo -e "${BLUE}Image Tag:       ${NC}${TAG}"
echo ""

# Confirm before proceeding
read -p "Do you want to proceed with the build? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Build cancelled."
    exit 0
fi

echo ""
echo "========================================="
echo "  📦 Building Images"
echo "========================================="

# ============================================================================
# Build Backend
# ============================================================================
echo ""
echo -e "${BLUE}1/2: Building Backend...${NC}"
cd ../backend

if docker build -f Dockerfile.prod -t ${REGISTRY}/kewalinvest-backend:${TAG} .; then
    echo -e "${GREEN}✅ Backend build successful${NC}"
else
    echo -e "${RED}❌ Backend build failed${NC}"
    exit 1
fi

# ============================================================================
# Build Frontend
# ============================================================================
echo ""
echo -e "${BLUE}2/2: Building Frontend...${NC}"
cd ../frontend

# Use the API URL from .env for the build
REACT_APP_API_URL=${REACT_APP_API_URL:-http://localhost:8080}

if docker build \
    -f Dockerfile.prod \
    --build-arg REACT_APP_API_URL=${REACT_APP_API_URL} \
    -t ${REGISTRY}/kewalinvest-frontend:${TAG} .; then
    echo -e "${GREEN}✅ Frontend build successful${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

cd ../client-deployment

echo ""
echo "========================================="
echo "  📤 Pushing Images to Docker Hub"
echo "========================================="
echo ""

# Check if logged in to Docker Hub
if ! docker info | grep -q "Username:"; then
    echo -e "${YELLOW}⚠️  You need to login to Docker Hub first${NC}"
    echo "Run: docker login"
    exit 1
fi

# ============================================================================
# Push Backend
# ============================================================================
echo -e "${BLUE}1/2: Pushing Backend...${NC}"
if docker push ${REGISTRY}/kewalinvest-backend:${TAG}; then
    echo -e "${GREEN}✅ Backend pushed successfully${NC}"
else
    echo -e "${RED}❌ Backend push failed${NC}"
    exit 1
fi

# ============================================================================
# Push Frontend
# ============================================================================
echo ""
echo -e "${BLUE}2/2: Pushing Frontend...${NC}"
if docker push ${REGISTRY}/kewalinvest-frontend:${TAG}; then
    echo -e "${GREEN}✅ Frontend pushed successfully${NC}"
else
    echo -e "${RED}❌ Frontend push failed${NC}"
    exit 1
fi

echo ""
echo "========================================="
echo "  ✅ Build & Push Complete!"
echo "========================================="
echo ""
echo "Images pushed to Docker Hub:"
echo "  • ${REGISTRY}/kewalinvest-backend:${TAG}"
echo "  • ${REGISTRY}/kewalinvest-frontend:${TAG}"
echo ""
echo "Next steps:"
echo "  1. Create deployment package (RAR/ZIP) with client-deployment folder"
echo "  2. Distribute to customers"
echo "  3. Customers run: ./configure.sh && ./deploy.sh"
echo ""
