#!/bin/bash
# Comprehensive health check script for Astral Field
# Validates application health across all components

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
ENVIRONMENT="staging"
BASE_URL=""
NAMESPACE=""
VERBOSE=false
TIMEOUT=30
RETRY_COUNT=3

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

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment    Environment (staging|production) [default: staging]"
    echo "  -u, --url           Base URL to test [auto-detected from environment]"
    echo "  -n, --namespace     Kubernetes namespace [auto-detected from environment]"
    echo "  -v, --verbose       Enable verbose output"
    echo "  -t, --timeout       Request timeout in seconds [default: 30]"
    echo "  -r, --retry         Number of retries for failed checks [default: 3]"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e staging"
    echo "  $0 -e production --verbose"
    echo "  $0 -u https://astralfield.com"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -r|--retry)
            RETRY_COUNT="$2"
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

# Set defaults based on environment
if [[ -z "$BASE_URL" ]]; then
    if [[ "$ENVIRONMENT" == "production" ]]; then
        BASE_URL="https://astralfield.com"
    else
        BASE_URL="https://staging.astralfield.com"
    fi
fi

if [[ -z "$NAMESPACE" ]]; then
    if [[ "$ENVIRONMENT" == "production" ]]; then
        NAMESPACE="astral-field"
    else
        NAMESPACE="astral-field-staging"
    fi
fi

log_info "Health check for Astral Field"
log_info "Environment: $ENVIRONMENT"
log_info "Base URL: $BASE_URL"
log_info "Namespace: $NAMESPACE"

# Global variables for tracking results
HEALTH_CHECKS=()
FAILED_CHECKS=0
TOTAL_CHECKS=0

# Function to add health check result
add_health_check() {
    local check_name="$1"
    local status="$2"
    local message="$3"
    
    HEALTH_CHECKS+=("$check_name|$status|$message")
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [[ "$status" == "FAIL" ]]; then
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Retry wrapper function
retry_command() {
    local retries=$RETRY_COUNT
    local count=0
    until "$@"; do
        exit_code=$?
        count=$((count + 1))
        if [[ $count -lt $retries ]]; then
            log_verbose "Command failed, retrying... ($count/$retries)"
            sleep 2
        else
            log_verbose "Command failed after $retries attempts"
            return $exit_code
        fi
    done
}

# Basic HTTP health check
check_basic_health() {
    log_info "Checking basic application health..."
    
    local response
    local http_code
    
    if response=$(retry_command curl -s -w "%{http_code}" --max-time "$TIMEOUT" "$BASE_URL/api/health"); then
        http_code="${response: -3}"
        response="${response%???}"
        
        if [[ "$http_code" == "200" ]]; then
            log_success "Basic health check passed"
            add_health_check "Basic Health" "PASS" "HTTP 200 OK"
            log_verbose "Response: $response"
            return 0
        else
            log_error "Basic health check failed - HTTP $http_code"
            add_health_check "Basic Health" "FAIL" "HTTP $http_code"
            return 1
        fi
    else
        log_error "Basic health check failed - Connection error"
        add_health_check "Basic Health" "FAIL" "Connection error"
        return 1
    fi
}

# Database connectivity check
check_database_health() {
    log_info "Checking database connectivity..."
    
    local response
    local http_code
    
    if response=$(retry_command curl -s -w "%{http_code}" --max-time "$TIMEOUT" "$BASE_URL/api/system/health/database"); then
        http_code="${response: -3}"
        response="${response%???}"
        
        if [[ "$http_code" == "200" ]]; then
            log_success "Database health check passed"
            add_health_check "Database" "PASS" "Connected"
            log_verbose "Response: $response"
            return 0
        else
            log_error "Database health check failed - HTTP $http_code"
            add_health_check "Database" "FAIL" "HTTP $http_code"
            return 1
        fi
    else
        log_error "Database health check failed - Connection error"
        add_health_check "Database" "FAIL" "Connection error"
        return 1
    fi
}

# Redis connectivity check
check_redis_health() {
    log_info "Checking Redis connectivity..."
    
    local response
    local http_code
    
    if response=$(retry_command curl -s -w "%{http_code}" --max-time "$TIMEOUT" "$BASE_URL/api/system/health/redis"); then
        http_code="${response: -3}"
        response="${response%???}"
        
        if [[ "$http_code" == "200" ]]; then
            log_success "Redis health check passed"
            add_health_check "Redis" "PASS" "Connected"
            log_verbose "Response: $response"
            return 0
        else
            log_error "Redis health check failed - HTTP $http_code"
            add_health_check "Redis" "FAIL" "HTTP $http_code"
            return 1
        fi
    else
        log_error "Redis health check failed - Connection error"
        add_health_check "Redis" "FAIL" "Connection error"
        return 1
    fi
}

# API endpoints check
check_api_endpoints() {
    log_info "Checking critical API endpoints..."
    
    local endpoints=(
        "/api/leagues"
        "/api/players"
        "/api/nfl/stats"
    )
    
    local failed_endpoints=0
    
    for endpoint in "${endpoints[@]}"; do
        log_verbose "Checking endpoint: $endpoint"
        
        local response
        local http_code
        
        if response=$(retry_command curl -s -w "%{http_code}" --max-time "$TIMEOUT" "$BASE_URL$endpoint"); then
            http_code="${response: -3}"
            
            if [[ "$http_code" == "200" ]]; then
                log_verbose "✓ $endpoint - OK"
            else
                log_warning "✗ $endpoint - HTTP $http_code"
                failed_endpoints=$((failed_endpoints + 1))
            fi
        else
            log_warning "✗ $endpoint - Connection error"
            failed_endpoints=$((failed_endpoints + 1))
        fi
    done
    
    if [[ $failed_endpoints -eq 0 ]]; then
        log_success "All API endpoints are healthy"
        add_health_check "API Endpoints" "PASS" "All endpoints responding"
        return 0
    else
        log_error "$failed_endpoints API endpoints failed"
        add_health_check "API Endpoints" "FAIL" "$failed_endpoints endpoints failed"
        return 1
    fi
}

# Performance check
check_performance() {
    log_info "Checking application performance..."
    
    local response_time
    
    if response_time=$(retry_command curl -s -w "%{time_total}" --max-time "$TIMEOUT" -o /dev/null "$BASE_URL/api/health"); then
        local response_ms
        response_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null | cut -d. -f1)
        
        if [[ $response_ms -lt 2000 ]]; then
            log_success "Performance check passed (${response_ms}ms)"
            add_health_check "Performance" "PASS" "${response_ms}ms response time"
            return 0
        else
            log_warning "Performance check warning - slow response (${response_ms}ms)"
            add_health_check "Performance" "WARN" "${response_ms}ms response time"
            return 1
        fi
    else
        log_error "Performance check failed - timeout"
        add_health_check "Performance" "FAIL" "Timeout"
        return 1
    fi
}

# Kubernetes pods health check
check_kubernetes_health() {
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available - skipping Kubernetes checks"
        add_health_check "Kubernetes" "SKIP" "kubectl not available"
        return 0
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        log_warning "Cannot connect to Kubernetes cluster - skipping pod checks"
        add_health_check "Kubernetes" "SKIP" "No cluster connection"
        return 0
    fi
    
    log_info "Checking Kubernetes pod health..."
    
    # Check app pods
    local app_ready
    local app_total
    app_ready=$(kubectl get pods -l app=astral-field-app -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    app_total=$(kubectl get pods -l app=astral-field-app -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo "0")
    
    # Check worker pods
    local worker_ready
    local worker_total
    worker_ready=$(kubectl get pods -l app=astral-field-worker -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    worker_total=$(kubectl get pods -l app=astral-field-worker -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo "0")
    
    # Check database pods
    local db_ready
    local db_total
    db_ready=$(kubectl get pods -l app=postgres -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    db_total=$(kubectl get pods -l app=postgres -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo "0")
    
    # Check redis pods
    local redis_ready
    local redis_total
    redis_ready=$(kubectl get pods -l app=redis -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    redis_total=$(kubectl get pods -l app=redis -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo "0")
    
    local pod_summary="App: $app_ready/$app_total, Worker: $worker_ready/$worker_total, DB: $db_ready/$db_total, Redis: $redis_ready/$redis_total"
    
    if [[ $app_ready -gt 0 && $worker_ready -gt 0 && $db_ready -gt 0 && $redis_ready -gt 0 ]]; then
        log_success "Kubernetes pods are healthy"
        add_health_check "Kubernetes Pods" "PASS" "$pod_summary"
        return 0
    else
        log_error "Some Kubernetes pods are not running"
        add_health_check "Kubernetes Pods" "FAIL" "$pod_summary"
        return 1
    fi
}

# Security headers check
check_security_headers() {
    log_info "Checking security headers..."
    
    local headers
    local missing_headers=()
    
    if headers=$(retry_command curl -sI --max-time "$TIMEOUT" "$BASE_URL"); then
        # Check for important security headers
        if ! echo "$headers" | grep -qi "X-Frame-Options"; then
            missing_headers+=("X-Frame-Options")
        fi
        
        if ! echo "$headers" | grep -qi "X-Content-Type-Options"; then
            missing_headers+=("X-Content-Type-Options")
        fi
        
        if ! echo "$headers" | grep -qi "X-XSS-Protection"; then
            missing_headers+=("X-XSS-Protection")
        fi
        
        if ! echo "$headers" | grep -qi "Strict-Transport-Security"; then
            missing_headers+=("Strict-Transport-Security")
        fi
        
        if [[ ${#missing_headers[@]} -eq 0 ]]; then
            log_success "Security headers check passed"
            add_health_check "Security Headers" "PASS" "All headers present"
            return 0
        else
            log_warning "Missing security headers: ${missing_headers[*]}"
            add_health_check "Security Headers" "WARN" "Missing: ${missing_headers[*]}"
            return 1
        fi
    else
        log_error "Could not retrieve headers"
        add_health_check "Security Headers" "FAIL" "Could not retrieve headers"
        return 1
    fi
}

# SSL certificate check
check_ssl_certificate() {
    if [[ "$BASE_URL" != https://* ]]; then
        log_info "Skipping SSL check for non-HTTPS URL"
        add_health_check "SSL Certificate" "SKIP" "HTTP URL"
        return 0
    fi
    
    log_info "Checking SSL certificate..."
    
    local domain
    domain=$(echo "$BASE_URL" | sed -e 's|^https://||' -e 's|/.*$||')
    
    local ssl_info
    if ssl_info=$(timeout "$TIMEOUT" openssl s_client -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null); then
        local not_after
        not_after=$(echo "$ssl_info" | grep "notAfter" | cut -d= -f2)
        
        if [[ -n "$not_after" ]]; then
            local expiry_date
            expiry_date=$(date -d "$not_after" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$not_after" +%s 2>/dev/null)
            local current_date
            current_date=$(date +%s)
            local days_until_expiry
            days_until_expiry=$(( (expiry_date - current_date) / 86400 ))
            
            if [[ $days_until_expiry -gt 30 ]]; then
                log_success "SSL certificate is valid ($days_until_expiry days until expiry)"
                add_health_check "SSL Certificate" "PASS" "$days_until_expiry days until expiry"
                return 0
            elif [[ $days_until_expiry -gt 0 ]]; then
                log_warning "SSL certificate expires soon ($days_until_expiry days)"
                add_health_check "SSL Certificate" "WARN" "Expires in $days_until_expiry days"
                return 1
            else
                log_error "SSL certificate has expired"
                add_health_check "SSL Certificate" "FAIL" "Expired"
                return 1
            fi
        else
            log_error "Could not parse SSL certificate expiry"
            add_health_check "SSL Certificate" "FAIL" "Could not parse expiry"
            return 1
        fi
    else
        log_error "Could not retrieve SSL certificate information"
        add_health_check "SSL Certificate" "FAIL" "Could not retrieve certificate"
        return 1
    fi
}

# Print health check summary
print_summary() {
    echo ""
    log_info "=== HEALTH CHECK SUMMARY ==="
    echo ""
    
    printf "%-20s %-8s %s\n" "CHECK" "STATUS" "MESSAGE"
    printf "%-20s %-8s %s\n" "-----" "------" "-------"
    
    local status_color
    for check in "${HEALTH_CHECKS[@]}"; do
        IFS='|' read -r name status message <<< "$check"
        
        case $status in
            "PASS")
                status_color="${GREEN}${status}${NC}"
                ;;
            "FAIL")
                status_color="${RED}${status}${NC}"
                ;;
            "WARN")
                status_color="${YELLOW}${status}${NC}"
                ;;
            "SKIP")
                status_color="${BLUE}${status}${NC}"
                ;;
            *)
                status_color="$status"
                ;;
        esac
        
        printf "%-20s %-15s %s\n" "$name" "$status_color" "$message"
    done
    
    echo ""
    
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        log_success "🎉 All health checks passed! ($TOTAL_CHECKS/$TOTAL_CHECKS)"
        return 0
    else
        log_error "❌ $FAILED_CHECKS/$TOTAL_CHECKS health checks failed"
        return 1
    fi
}

# Main health check flow
main() {
    log_info "Starting comprehensive health check..."
    echo ""
    
    # Run all health checks
    check_basic_health
    check_database_health
    check_redis_health
    check_api_endpoints
    check_performance
    check_kubernetes_health
    check_security_headers
    check_ssl_certificate
    
    # Print summary and exit with appropriate code
    print_summary
}

# Run main function
main "$@"