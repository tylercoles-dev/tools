#!/bin/bash

# MCP Tools Deployment Script
# This script helps deploy the MCP Tools ecosystem using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="local"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Functions
print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --env ENVIRONMENT    Environment (local, dev, prod) [default: local]"
    echo "  -f, --file FILE         Docker compose file [default: docker-compose.yml]"
    echo "  --env-file FILE         Environment file [default: .env]"
    echo "  --build                 Force rebuild of images"
    echo "  --pull                  Pull latest images from registry"
    echo "  --scale SERVICE=NUM     Scale specific service"
    echo "  --stop                  Stop all services"
    echo "  --logs SERVICE          Show logs for specific service"
    echo "  --status                Show status of all services"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Start local development"
    echo "  $0 --env prod --pull                 # Deploy production with latest images"
    echo "  $0 --scale embeddings-worker=4       # Scale embeddings worker to 4 replicas"
    echo "  $0 --logs gateway                    # Show gateway logs"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    print_info "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    print_success "Requirements check passed"
}

setup_environment() {
    print_info "Setting up environment for: $ENVIRONMENT"
    
    case $ENVIRONMENT in
        "local")
            COMPOSE_FILE="docker-compose.yml:docker-compose.override.yml"
            ;;
        "dev")
            COMPOSE_FILE="docker-compose.yml:docker-compose.dev.yml" 
            ;;
        "prod")
            COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"
            ;;
        *)
            print_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    # Check if environment file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        if [[ -f ".env.example" ]]; then
            print_warning "No $ENV_FILE found, copying from .env.example"
            cp .env.example "$ENV_FILE"
            print_warning "Please edit $ENV_FILE with your configuration"
        else
            print_error "No environment file found and no .env.example to copy from"
            exit 1
        fi
    fi
}

deploy_services() {
    print_info "Deploying MCP Tools services..."
    
    local compose_args=""
    
    if [[ "$BUILD" == "true" ]]; then
        compose_args="$compose_args --build"
    fi
    
    if [[ "$PULL" == "true" ]]; then
        print_info "Pulling latest images..."
        docker-compose -f ${COMPOSE_FILE//:/ -f } pull
    fi
    
    print_info "Starting services..."
    docker-compose -f ${COMPOSE_FILE//:/ -f } --env-file "$ENV_FILE" up -d $compose_args
    
    print_success "Services started successfully"
    print_info "Web UI available at: http://localhost:80"
    print_info "API Gateway available at: http://localhost:3000"
    print_info "Kanban MCP Server available at: http://localhost:3002"
    print_info "Wiki MCP Server available at: http://localhost:3003"
    print_info "Memory MCP Server available at: http://localhost:3004"
}

show_status() {
    print_info "Service Status:"
    docker-compose -f ${COMPOSE_FILE//:/ -f } ps
}

show_logs() {
    local service=$1
    if [[ -z "$service" ]]; then
        docker-compose -f ${COMPOSE_FILE//:/ -f } logs -f
    else
        docker-compose -f ${COMPOSE_FILE//:/ -f } logs -f "$service"
    fi
}

stop_services() {
    print_info "Stopping all services..."
    docker-compose -f ${COMPOSE_FILE//:/ -f } down
    print_success "All services stopped"
}

scale_service() {
    local scale_arg=$1
    print_info "Scaling service: $scale_arg"
    docker-compose -f ${COMPOSE_FILE//:/ -f } up -d --scale "$scale_arg"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        --env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        --build)
            BUILD="true"
            shift
            ;;
        --pull)
            PULL="true"
            shift
            ;;
        --scale)
            SCALE_ARG="$2"
            shift 2
            ;;
        --stop)
            STOP="true"
            shift
            ;;
        --logs)
            LOGS_SERVICE="$2"
            shift 2
            ;;
        --status)
            STATUS="true"
            shift
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Main execution
print_info "MCP Tools Deployment Script"
print_info "=============================="

check_requirements

if [[ "$STOP" == "true" ]]; then
    setup_environment
    stop_services
    exit 0
fi

if [[ "$STATUS" == "true" ]]; then
    setup_environment
    show_status
    exit 0
fi

if [[ -n "$LOGS_SERVICE" ]]; then
    setup_environment
    show_logs "$LOGS_SERVICE"
    exit 0
fi

if [[ -n "$SCALE_ARG" ]]; then
    setup_environment
    scale_service "$SCALE_ARG"
    exit 0
fi

# Default action: deploy
setup_environment
deploy_services

print_success "Deployment completed!"
print_info "Use '$0 --status' to check service status"
print_info "Use '$0 --logs SERVICE_NAME' to view service logs"
print_info "Use '$0 --stop' to stop all services"