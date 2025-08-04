#!/bin/bash

# Script to publish Docker images to GitHub Container Registry
# Organization: tylercoles-dev

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Registry and organization
REGISTRY="ghcr.io"
ORG="tylercoles-dev"

# List of services to publish
SERVICES=(
    "migrations"
    "kanban"
    "wiki"
    "memory"
    "gateway"
    "markitdown-worker"
    "web"
)

echo -e "${YELLOW}Starting publication of MCP Tools Docker images to ${REGISTRY}/${ORG}${NC}"
echo ""

# Check if logged in to GitHub Container Registry
echo -e "${YELLOW}Checking GitHub Container Registry authentication...${NC}"
if ! docker info 2>/dev/null | grep -q "${REGISTRY}"; then
    echo -e "${RED}Not logged in to GitHub Container Registry${NC}"
    echo "Please run: echo \$GITHUB_TOKEN | docker login ${REGISTRY} -u USERNAME --password-stdin"
    exit 1
fi

# Tag and push each service
for SERVICE in "${SERVICES[@]}"; do
    LOCAL_IMAGE="mcp-tools-${SERVICE}:latest"
    REMOTE_IMAGE="${REGISTRY}/${ORG}/mcp-tools-${SERVICE}"
    
    echo -e "${YELLOW}Processing ${SERVICE}...${NC}"
    
    # Check if local image exists
    if ! docker image inspect "${LOCAL_IMAGE}" >/dev/null 2>&1; then
        echo -e "${RED}  ✗ Local image ${LOCAL_IMAGE} not found, skipping${NC}"
        continue
    fi
    
    # Tag for PostgreSQL version
    echo "  → Tagging as ${REMOTE_IMAGE}:postgresql"
    docker tag "${LOCAL_IMAGE}" "${REMOTE_IMAGE}:postgresql"
    
    # Tag as latest
    echo "  → Tagging as ${REMOTE_IMAGE}:latest"
    docker tag "${LOCAL_IMAGE}" "${REMOTE_IMAGE}:latest"
    
    # Push PostgreSQL tag
    echo "  → Pushing ${REMOTE_IMAGE}:postgresql"
    if docker push "${REMOTE_IMAGE}:postgresql"; then
        echo -e "${GREEN}  ✓ Successfully pushed :postgresql tag${NC}"
    else
        echo -e "${RED}  ✗ Failed to push :postgresql tag${NC}"
        continue
    fi
    
    # Push latest tag
    echo "  → Pushing ${REMOTE_IMAGE}:latest"
    if docker push "${REMOTE_IMAGE}:latest"; then
        echo -e "${GREEN}  ✓ Successfully pushed :latest tag${NC}"
    else
        echo -e "${RED}  ✗ Failed to push :latest tag${NC}"
    fi
    
    echo ""
done

echo -e "${GREEN}Image publication complete!${NC}"
echo ""
echo "To pull these images, use:"
echo ""
for SERVICE in "${SERVICES[@]}"; do
    echo "docker pull ${REGISTRY}/${ORG}/mcp-tools-${SERVICE}:postgresql"
done