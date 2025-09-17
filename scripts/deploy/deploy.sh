#!/bin/bash
# Main deployment script for Astral Field Fantasy Football Platform
# Supports multiple environments and deployment strategies

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=""
VERSION=""
NAMESPACE=""
DRY_RUN=false
SKIP_TESTS=false
ROLLBACK_ON_FAILURE=true
DEPLOYMENT_TIMEOUT=600

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment    Environment to deploy to (staging|production)"
    echo "  -v, --version        Version/tag to deploy (default: latest)"
    echo "  -n, --namespace      Kubernetes namespace (default: astral-field-{environment})"
    echo "  -d, --dry-run        Perform a dry run without making changes"
    echo "  -s, --skip-tests     Skip post-deployment tests"
    echo "  -t, --timeout        Deployment timeout in seconds (default: 600)"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e staging -v v1.2.3"
    echo "  $0 -e production -v latest --skip-tests"
    echo "  $0 -e staging --dry-run"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -t|--timeout)
            DEPLOYMENT_TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$ENVIRONMENT" ]]; then
    log_error "Environment is required. Use -e to specify staging or production."
    usage
    exit 1
fi

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Environment must be either 'staging' or 'production'"
    exit 1
fi

# Set defaults based on environment
if [[ -z "$VERSION" ]]; then
    if [[ "$ENVIRONMENT" == "production" ]]; then
        VERSION="latest"
    else
        VERSION="staging"
    fi
fi

if [[ -z "$NAMESPACE" ]]; then
    if [[ "$ENVIRONMENT" == "production" ]]; then
        NAMESPACE="astral-field"
    else
        NAMESPACE="astral-field-staging"
    fi
fi

log_info "Starting deployment for Astral Field"
log_info "Environment: $ENVIRONMENT"
log_info "Version: $VERSION"
log_info "Namespace: $NAMESPACE"
log_info "Dry run: $DRY_RUN"

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if we can connect to Kubernetes cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace '$NAMESPACE' does not exist"
        exit 1
    fi
    
    # Check if Docker is available (for local builds)
    if ! command -v docker &> /dev/null; then
        log_warning "Docker is not available - skipping local build checks"
    fi
    
    log_success "Prerequisites check passed"
}

# Backup current deployment
backup_current_deployment() {
    log_info "Backing up current deployment..."
    
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)_${ENVIRONMENT}"
    mkdir -p "$backup_dir"
    
    # Backup deployment configurations
    kubectl get deployment -n "$NAMESPACE" -o yaml > "$backup_dir/deployments.yaml" || true
    kubectl get service -n "$NAMESPACE" -o yaml > "$backup_dir/services.yaml" || true
    kubectl get ingress -n "$NAMESPACE" -o yaml > "$backup_dir/ingress.yaml" || true
    kubectl get configmap -n "$NAMESPACE" -o yaml > "$backup_dir/configmaps.yaml" || true
    
    # Get current image versions
    kubectl get deployment -n "$NAMESPACE" -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.template.spec.containers[0].image}{"\n"}{end}' > "$backup_dir/current_images.txt" || true
    
    log_success "Backup created in $backup_dir"
    echo "$backup_dir" > "/tmp/astral_field_backup_path"
}

# Deploy to Kubernetes
deploy_to_kubernetes() {
    log_info "Deploying to Kubernetes..."
    
    local kubectl_cmd="kubectl"
    if [[ "$DRY_RUN" == "true" ]]; then
        kubectl_cmd="kubectl --dry-run=client"
        log_info "Dry run mode - no actual changes will be made"
    fi
    
    # Update image tags in deployment files
    if [[ -f "k8s/deployment.yaml" ]]; then
        # Create temporary deployment file with updated image tags
        local temp_deployment="/tmp/deployment_${ENVIRONMENT}_${VERSION}.yaml"
        sed "s|ghcr.io/your-username/astral-field:latest|ghcr.io/your-username/astral-field:${VERSION}|g" k8s/deployment.yaml > "$temp_deployment"
        sed -i "s|ghcr.io/your-username/astral-field-worker:latest|ghcr.io/your-username/astral-field-worker:${VERSION}|g" "$temp_deployment"
        
        # Apply the deployment
        $kubectl_cmd apply -f "$temp_deployment" -n "$NAMESPACE"
        
        # Clean up temp file
        rm -f "$temp_deployment"
    else
        log_error "Deployment file k8s/deployment.yaml not found"
        exit 1
    fi
    
    # Apply other Kubernetes resources
    if [[ -f "k8s/service.yaml" ]]; then
        $kubectl_cmd apply -f k8s/service.yaml -n "$NAMESPACE"
    fi
    
    if [[ -f "k8s/configmap.yaml" ]]; then
        $kubectl_cmd apply -f k8s/configmap.yaml -n "$NAMESPACE"
    fi
    
    if [[ -f "k8s/monitoring.yaml" ]]; then
        $kubectl_cmd apply -f k8s/monitoring.yaml -n "$NAMESPACE"
    fi
    
    log_success "Kubernetes resources applied"
}

# Wait for deployment to complete
wait_for_deployment() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Skipping deployment wait in dry run mode"
        return 0
    fi
    
    log_info "Waiting for deployment to complete..."
    
    # Wait for main app deployment
    if kubectl rollout status deployment/astral-field-app -n "$NAMESPACE" --timeout="${DEPLOYMENT_TIMEOUT}s"; then
        log_success "Main app deployment completed successfully"
    else
        log_error "Main app deployment failed or timed out"
        return 1
    fi
    
    # Wait for worker deployment
    if kubectl rollout status deployment/astral-field-worker -n "$NAMESPACE" --timeout="${DEPLOYMENT_TIMEOUT}s"; then
        log_success "Worker deployment completed successfully"
    else
        log_error "Worker deployment failed or timed out"
        return 1
    fi
    
    # Wait for pods to be ready
    log_info "Waiting for pods to be ready..."
    if kubectl wait --for=condition=ready pod -l app=astral-field-app -n "$NAMESPACE" --timeout="${DEPLOYMENT_TIMEOUT}s"; then
        log_success "All pods are ready"
    else
        log_error "Pods are not ready within timeout"
        return 1
    fi
}

# Run post-deployment tests
run_post_deployment_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_info "Skipping post-deployment tests"
        return 0
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Skipping tests in dry run mode"
        return 0
    fi
    
    log_info "Running post-deployment tests..."
    
    # Get the application URL based on environment
    local app_url
    if [[ "$ENVIRONMENT" == "production" ]]; then
        app_url="https://astralfield.com"
    else
        app_url="https://staging.astralfield.com"
    fi
    
    # Health check
    log_info "Running health check..."
    if curl -f -s "${app_url}/api/health" > /dev/null; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        return 1
    fi
    
    # Database connectivity check
    log_info "Checking database connectivity..."
    if curl -f -s "${app_url}/api/system/health/database" > /dev/null; then
        log_success "Database connectivity check passed"
    else
        log_error "Database connectivity check failed"
        return 1
    fi
    
    # Redis connectivity check
    log_info "Checking Redis connectivity..."
    if curl -f -s "${app_url}/api/system/health/redis" > /dev/null; then
        log_success "Redis connectivity check passed"
    else
        log_error "Redis connectivity check failed"
        return 1
    fi
    
    # Run smoke tests if available
    if [[ -f "scripts/deploy/smoke-tests.sh" ]]; then
        log_info "Running smoke tests..."
        if bash scripts/deploy/smoke-tests.sh "$app_url"; then
            log_success "Smoke tests passed"
        else
            log_error "Smoke tests failed"
            return 1
        fi
    fi
    
    log_success "All post-deployment tests passed"
}

# Rollback deployment
rollback_deployment() {
    log_error "Deployment failed - initiating rollback..."
    
    # Get backup path
    local backup_path
    if [[ -f "/tmp/astral_field_backup_path" ]]; then
        backup_path=$(cat /tmp/astral_field_backup_path)
        log_info "Using backup from: $backup_path"
        
        # Rollback using previous deployment
        if kubectl rollout undo deployment/astral-field-app -n "$NAMESPACE"; then
            log_success "App deployment rolled back"
        else
            log_error "Failed to rollback app deployment"
        fi
        
        if kubectl rollout undo deployment/astral-field-worker -n "$NAMESPACE"; then
            log_success "Worker deployment rolled back"
        else
            log_error "Failed to rollback worker deployment"
        fi
        
        # Wait for rollback to complete
        kubectl rollout status deployment/astral-field-app -n "$NAMESPACE" --timeout=300s
        kubectl rollout status deployment/astral-field-worker -n "$NAMESPACE" --timeout=300s
        
        log_success "Rollback completed"
    else
        log_error "No backup found - manual intervention required"
    fi
}

# Cleanup temporary files
cleanup() {
    rm -f /tmp/astral_field_backup_path
    rm -f /tmp/deployment_${ENVIRONMENT}_${VERSION}.yaml
}

# Main deployment flow
main() {
    trap cleanup EXIT
    
    check_prerequisites
    backup_current_deployment
    
    if deploy_to_kubernetes && wait_for_deployment && run_post_deployment_tests; then
        log_success "🎉 Deployment completed successfully!"
        log_info "Environment: $ENVIRONMENT"
        log_info "Version: $VERSION"
        log_info "Namespace: $NAMESPACE"
        
        # Send success notification
        if [[ -f "scripts/deploy/notify.sh" ]]; then
            bash scripts/deploy/notify.sh "success" "$ENVIRONMENT" "$VERSION"
        fi
        
        exit 0
    else
        log_error "❌ Deployment failed!"
        
        if [[ "$ROLLBACK_ON_FAILURE" == "true" && "$DRY_RUN" != "true" ]]; then
            rollback_deployment
        fi
        
        # Send failure notification
        if [[ -f "scripts/deploy/notify.sh" ]]; then
            bash scripts/deploy/notify.sh "failure" "$ENVIRONMENT" "$VERSION"
        fi
        
        exit 1
    fi
}

# Run main function
main "$@"