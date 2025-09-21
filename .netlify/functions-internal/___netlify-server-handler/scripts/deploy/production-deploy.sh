#!/bin/bash

# AstralField v2.1 Production Deployment Script
# Automated deployment with health checks and rollback capability

set -euo pipefail

# Configuration
PROJECT_NAME="astralfield-v2.1"
DOCKER_COMPOSE_FILE="docker/docker-compose.production.yml"
BACKUP_DIR="/opt/backups/astralfield"
LOG_FILE="/var/log/astralfield-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Health check function
health_check() {
    local max_attempts=30
    local attempt=1
    
    log "Performing health check..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
            success "Health check passed on attempt $attempt"
            return 0
        fi
        
        log "Health check attempt $attempt failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
}

# Backup current deployment
backup_current() {
    log "Creating backup of current deployment..."
    
    mkdir -p "$BACKUP_DIR"
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    # Backup current docker-compose file and environment
    mkdir -p "$backup_path"
    cp "$DOCKER_COMPOSE_FILE" "$backup_path/" 2>/dev/null || true
    cp .env.production "$backup_path/" 2>/dev/null || true
    
    # Backup current container image
    docker save astralfield-production:latest > "$backup_path/image.tar" 2>/dev/null || true
    
    echo "$backup_name" > "$BACKUP_DIR/latest-backup"
    success "Backup created: $backup_name"
}

# Rollback function
rollback() {
    warning "Initiating rollback procedure..."
    
    local latest_backup=$(cat "$BACKUP_DIR/latest-backup" 2>/dev/null || echo "")
    
    if [ -z "$latest_backup" ]; then
        error "No backup found for rollback"
    fi
    
    local backup_path="$BACKUP_DIR/$latest_backup"
    
    # Stop current deployment
    docker-compose -f "$DOCKER_COMPOSE_FILE" down || true
    
    # Restore backup
    if [ -f "$backup_path/image.tar" ]; then
        docker load < "$backup_path/image.tar"
    fi
    
    if [ -f "$backup_path/docker-compose.production.yml" ]; then
        cp "$backup_path/docker-compose.production.yml" "$DOCKER_COMPOSE_FILE"
    fi
    
    # Start previous version
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    if health_check; then
        success "Rollback completed successfully"
    else
        error "Rollback failed - manual intervention required"
    fi
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running"
    fi
    
    # Check if docker-compose file exists
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        error "Docker compose file not found: $DOCKER_COMPOSE_FILE"
    fi
    
    # Check if environment file exists
    if [ ! -f ".env.production" ]; then
        warning "Production environment file not found"
    fi
    
    # Check available disk space
    local available_space=$(df / | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 1048576 ]; then # 1GB in KB
        warning "Low disk space: $(($available_space / 1024))MB available"
    fi
    
    success "Pre-deployment checks passed"
}

# Main deployment function
deploy() {
    log "Starting deployment of $PROJECT_NAME..."
    
    # Pre-deployment checks
    pre_deployment_checks
    
    # Create backup
    backup_current
    
    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Stop current deployment with grace period
    log "Stopping current deployment..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --timeout 30
    
    # Start new deployment
    log "Starting new deployment..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Health check
    if health_check; then
        success "Deployment completed successfully"
        
        # Cleanup old images
        log "Cleaning up old Docker images..."
        docker image prune -af --filter="until=72h" || true
        
        # Cleanup old backups (keep last 5)
        log "Cleaning up old backups..."
        find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup-*" | sort -r | tail -n +6 | xargs rm -rf || true
        
        success "Deployment and cleanup completed"
    else
        error "Deployment failed health check - initiating rollback"
        rollback
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [deploy|rollback|health|logs]"
    echo "  deploy   - Deploy latest version"
    echo "  rollback - Rollback to previous version"
    echo "  health   - Run health check"
    echo "  logs     - Show deployment logs"
    exit 1
}

# Parse command line arguments
case "${1:-}" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback
        ;;
    "health")
        health_check
        ;;
    "logs")
        tail -f "$LOG_FILE"
        ;;
    *)
        usage
        ;;
esac