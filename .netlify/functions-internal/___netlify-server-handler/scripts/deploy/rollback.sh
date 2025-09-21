#!/bin/bash
# Emergency rollback script for Astral Field
# Quickly reverts to previous stable version

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
ENVIRONMENT=""
NAMESPACE=""
ROLLBACK_STEPS=1
CONFIRM=true
TIMEOUT=300

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
    echo "  -e, --environment    Environment (staging|production) [REQUIRED]"
    echo "  -n, --namespace      Kubernetes namespace [auto-detected from environment]"
    echo "  -s, --steps          Number of rollback steps [default: 1]"
    echo "  -f, --force          Skip confirmation prompts"
    echo "  -t, --timeout        Rollback timeout in seconds [default: 300]"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e staging"
    echo "  $0 -e production --force"
    echo "  $0 -e staging -s 2"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -s|--steps)
            ROLLBACK_STEPS="$2"
            shift 2
            ;;
        -f|--force)
            CONFIRM=false
            shift
            ;;
        -t|--timeout)
            TIMEOUT="$2"
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

# Set namespace based on environment if not provided
if [[ -z "$NAMESPACE" ]]; then
    if [[ "$ENVIRONMENT" == "production" ]]; then
        NAMESPACE="astral-field"
    else
        NAMESPACE="astral-field-staging"
    fi
fi

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
    
    log_success "Prerequisites check passed"
}

# Show current deployment status
show_current_status() {
    log_info "Current deployment status:"
    echo ""
    
    # Show deployments
    echo "=== DEPLOYMENTS ==="
    kubectl get deployments -n "$NAMESPACE" -o wide
    echo ""
    
    # Show rollout history for main app
    echo "=== ROLLOUT HISTORY - APP ==="
    kubectl rollout history deployment/astral-field-app -n "$NAMESPACE" || log_warning "Could not get app rollout history"
    echo ""
    
    # Show rollout history for worker
    echo "=== ROLLOUT HISTORY - WORKER ==="
    kubectl rollout history deployment/astral-field-worker -n "$NAMESPACE" || log_warning "Could not get worker rollout history"
    echo ""
    
    # Show pod status
    echo "=== PODS ==="
    kubectl get pods -n "$NAMESPACE" -o wide
    echo ""
}

# Get deployment revision to rollback to
get_rollback_revision() {
    local deployment_name="$1"
    local current_revision
    local rollback_revision
    
    # Get current revision
    current_revision=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')
    
    if [[ -z "$current_revision" ]]; then
        log_error "Could not determine current revision for $deployment_name"
        return 1
    fi
    
    # Calculate rollback revision
    rollback_revision=$((current_revision - ROLLBACK_STEPS))
    
    if [[ $rollback_revision -le 0 ]]; then
        log_error "Cannot rollback $ROLLBACK_STEPS steps from revision $current_revision"
        return 1
    fi
    
    echo "$rollback_revision"
}

# Perform rollback
perform_rollback() {
    log_info "Starting rollback process..."
    
    local deployments=("astral-field-app" "astral-field-worker")
    local failed_rollbacks=()
    
    for deployment in "${deployments[@]}"; do
        log_info "Rolling back $deployment..."
        
        # Check if deployment exists
        if ! kubectl get deployment "$deployment" -n "$NAMESPACE" &> /dev/null; then
            log_warning "Deployment $deployment not found, skipping"
            continue
        fi
        
        # Get revision to rollback to
        local rollback_revision
        if rollback_revision=$(get_rollback_revision "$deployment"); then
            log_info "Rolling back $deployment to revision $rollback_revision"
            
            # Perform rollback
            if kubectl rollout undo deployment/"$deployment" -n "$NAMESPACE" --to-revision="$rollback_revision"; then
                log_success "Rollback initiated for $deployment"
            else
                log_error "Failed to initiate rollback for $deployment"
                failed_rollbacks+=("$deployment")
            fi
        else
            # Fallback to simple undo (previous revision)
            log_warning "Cannot determine specific revision, rolling back to previous version"
            
            if kubectl rollout undo deployment/"$deployment" -n "$NAMESPACE"; then
                log_success "Rollback initiated for $deployment"
            else
                log_error "Failed to initiate rollback for $deployment"
                failed_rollbacks+=("$deployment")
            fi
        fi
    done
    
    if [[ ${#failed_rollbacks[@]} -gt 0 ]]; then
        log_error "Failed to rollback: ${failed_rollbacks[*]}"
        return 1
    fi
    
    return 0
}

# Wait for rollback to complete
wait_for_rollback() {
    log_info "Waiting for rollback to complete..."
    
    local deployments=("astral-field-app" "astral-field-worker")
    local failed_deployments=()
    
    for deployment in "${deployments[@]}"; do
        # Check if deployment exists
        if ! kubectl get deployment "$deployment" -n "$NAMESPACE" &> /dev/null; then
            log_warning "Deployment $deployment not found, skipping wait"
            continue
        fi
        
        log_info "Waiting for $deployment rollback..."
        
        if kubectl rollout status deployment/"$deployment" -n "$NAMESPACE" --timeout="${TIMEOUT}s"; then
            log_success "$deployment rollback completed"
        else
            log_error "$deployment rollback failed or timed out"
            failed_deployments+=("$deployment")
        fi
    done
    
    if [[ ${#failed_deployments[@]} -gt 0 ]]; then
        log_error "Rollback failed for: ${failed_deployments[*]}"
        return 1
    fi
    
    return 0
}

# Verify rollback success
verify_rollback() {
    log_info "Verifying rollback success..."
    
    # Wait a moment for services to stabilize
    sleep 10
    
    # Check if pods are running
    local app_running
    app_running=$(kubectl get pods -l app=astral-field-app -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    
    local worker_running
    worker_running=$(kubectl get pods -l app=astral-field-worker -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    
    if [[ $app_running -gt 0 && $worker_running -gt 0 ]]; then
        log_success "Rollback verification: Pods are running"
    else
        log_error "Rollback verification: Some pods are not running (App: $app_running, Worker: $worker_running)"
        return 1
    fi
    
    # Run basic health check if script exists
    if [[ -f "scripts/deploy/health-check.sh" ]]; then
        log_info "Running post-rollback health check..."
        if bash scripts/deploy/health-check.sh -e "$ENVIRONMENT" --timeout 10; then
            log_success "Post-rollback health check passed"
        else
            log_warning "Post-rollback health check failed - manual verification needed"
            return 1
        fi
    else
        log_info "Health check script not found - manual verification recommended"
    fi
    
    return 0
}

# Show final status
show_final_status() {
    log_info "Final deployment status after rollback:"
    echo ""
    
    # Show deployments
    kubectl get deployments -n "$NAMESPACE" -o wide
    echo ""
    
    # Show pods
    kubectl get pods -n "$NAMESPACE" -o wide
    echo ""
    
    # Show current images
    log_info "Current container images:"
    kubectl get deployment -n "$NAMESPACE" -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.template.spec.containers[0].image}{"\n"}{end}'
}

# Main rollback flow
main() {
    echo ""
    log_warning "🚨 ROLLBACK WARNING 🚨"
    echo "You are about to rollback the $ENVIRONMENT environment."
    echo "This will revert to a previous version of the application."
    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Namespace: $NAMESPACE"
    echo "Rollback steps: $ROLLBACK_STEPS"
    echo ""
    
    check_prerequisites
    show_current_status
    
    if [[ "$CONFIRM" == "true" ]]; then
        echo ""
        read -p "Are you sure you want to proceed with rollback? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Rollback cancelled by user"
            exit 0
        fi
        echo ""
    fi
    
    if perform_rollback && wait_for_rollback && verify_rollback; then
        echo ""
        log_success "🎉 Rollback completed successfully!"
        show_final_status
        
        # Send notification if script exists
        if [[ -f "scripts/deploy/notify.sh" ]]; then
            bash scripts/deploy/notify.sh "rollback" "$ENVIRONMENT" "$ROLLBACK_STEPS"
        fi
        
        exit 0
    else
        echo ""
        log_error "❌ Rollback failed or verification unsuccessful!"
        log_error "Manual intervention may be required."
        show_final_status
        
        # Send failure notification if script exists
        if [[ -f "scripts/deploy/notify.sh" ]]; then
            bash scripts/deploy/notify.sh "rollback_failed" "$ENVIRONMENT" "$ROLLBACK_STEPS"
        fi
        
        exit 1
    fi
}

# Production safety check
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo ""
    log_warning "⚠️  PRODUCTION ROLLBACK WARNING ⚠️"
    echo "You are about to rollback the PRODUCTION environment!"
    echo "This is a critical operation that affects live users."
    echo ""
    echo "Please ensure:"
    echo "1. You have identified the issue requiring rollback"
    echo "2. You have stakeholder approval for production rollback"
    echo "3. You are prepared to handle any data consistency issues"
    echo "4. You have a plan to fix the underlying issue"
    echo ""
    
    if [[ "$CONFIRM" == "true" ]]; then
        read -p "Do you have approval to rollback production? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Production rollback cancelled"
            exit 0
        fi
    fi
fi

# Run main function
main "$@"