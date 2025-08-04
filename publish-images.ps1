# PowerShell script to publish Docker images to GitHub Container Registry
# Organization: tylercoles-dev

# Registry and organization
$REGISTRY = "ghcr.io"
$ORG = "tylercoles-dev"

# List of services to publish
$SERVICES = @(
    "migrations",
    "kanban",
    "wiki",
    "memory",
    "gateway",
    "markitdown-worker",
    "web"
)

Write-Host "Starting publication of MCP Tools Docker images to $REGISTRY/$ORG" -ForegroundColor Yellow
Write-Host ""

# Check if logged in to GitHub Container Registry
Write-Host "Checking GitHub Container Registry authentication..." -ForegroundColor Yellow
$dockerInfo = docker info 2>&1
if ($dockerInfo -notmatch $REGISTRY) {
    Write-Host "Not logged in to GitHub Container Registry" -ForegroundColor Red
    Write-Host "Please run: echo `$GITHUB_TOKEN | docker login $REGISTRY -u USERNAME --password-stdin"
    exit 1
}

# Tag and push each service
foreach ($SERVICE in $SERVICES) {
    $LOCAL_IMAGE = "mcp-tools-$SERVICE:latest"
    $REMOTE_IMAGE = "$REGISTRY/$ORG/mcp-tools-$SERVICE"
    
    Write-Host "Processing $SERVICE..." -ForegroundColor Yellow
    
    # Check if local image exists
    docker image inspect $LOCAL_IMAGE 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  X Local image $LOCAL_IMAGE not found, skipping" -ForegroundColor Red
        continue
    }
    
    # Tag for PostgreSQL version
    Write-Host "  -> Tagging as ${REMOTE_IMAGE}:postgresql"
    docker tag $LOCAL_IMAGE "${REMOTE_IMAGE}:postgresql"
    
    # Tag as latest
    Write-Host "  -> Tagging as ${REMOTE_IMAGE}:latest"
    docker tag $LOCAL_IMAGE "${REMOTE_IMAGE}:latest"
    
    # Push PostgreSQL tag
    Write-Host "  -> Pushing ${REMOTE_IMAGE}:postgresql"
    docker push "${REMOTE_IMAGE}:postgresql"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Successfully pushed :postgresql tag" -ForegroundColor Green
    } else {
        Write-Host "  X Failed to push :postgresql tag" -ForegroundColor Red
        continue
    }
    
    # Push latest tag
    Write-Host "  -> Pushing ${REMOTE_IMAGE}:latest"
    docker push "${REMOTE_IMAGE}:latest"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Successfully pushed :latest tag" -ForegroundColor Green
    } else {
        Write-Host "  X Failed to push :latest tag" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "Image publication complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To pull these images, use:"
Write-Host ""
foreach ($SERVICE in $SERVICES) {
    Write-Host "docker pull $REGISTRY/$ORG/mcp-tools-${SERVICE}:postgresql"
}