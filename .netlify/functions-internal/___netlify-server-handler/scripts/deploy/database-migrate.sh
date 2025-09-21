#!/bin/bash
# Database migration script for Astral Field
# Handles migrations in different environments safely

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
ENVIRONMENT="staging"
NAMESPACE=""
DRY_RUN=false
BACKUP_BEFORE_MIGRATE=true
MIGRATION_TIMEOUT=300

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
    echo "  -e, --environment    Environment (staging|production) [default: staging]"
    echo "  -n, --namespace      Kubernetes namespace"
    echo "  -d, --dry-run        Show what migrations would run without executing"
    echo "  -s, --skip-backup    Skip database backup before migration"
    echo "  -t, --timeout        Migration timeout in seconds [default: 300]"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e staging"
    echo "  $0 -e production --skip-backup"
    echo "  $0 -e staging --dry-run"
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
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -s|--skip-backup)
            BACKUP_BEFORE_MIGRATE=false
            shift
            ;;
        -t|--timeout)
            MIGRATION_TIMEOUT="$2"
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

# Set namespace based on environment if not provided
if [[ -z "$NAMESPACE" ]]; then
    if [[ "$ENVIRONMENT" == "production" ]]; then
        NAMESPACE="astral-field"
    else
        NAMESPACE="astral-field-staging"
    fi
fi

log_info "Database migration for Astral Field"
log_info "Environment: $ENVIRONMENT"
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
    
    # Check if database pod exists
    if ! kubectl get pod -l app=postgres -n "$NAMESPACE" | grep -q postgres; then
        log_error "PostgreSQL pod not found in namespace $NAMESPACE"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Get database pod name
get_db_pod() {
    kubectl get pod -l app=postgres -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}'
}

# Check database connectivity
check_db_connectivity() {
    log_info "Checking database connectivity..."
    
    local db_pod
    db_pod=$(get_db_pod)
    
    if kubectl exec "$db_pod" -n "$NAMESPACE" -- pg_isready > /dev/null; then
        log_success "Database is ready"
    else
        log_error "Database is not ready"
        exit 1
    fi
}

# Backup database
backup_database() {
    if [[ "$BACKUP_BEFORE_MIGRATE" == "false" ]]; then
        log_info "Skipping database backup"
        return 0
    fi
    
    log_info "Creating database backup..."
    
    local db_pod
    local backup_name
    local db_name
    
    db_pod=$(get_db_pod)
    backup_name="backup_$(date +%Y%m%d_%H%M%S)_${ENVIRONMENT}"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        db_name="astralfield"
    else
        db_name="astralfield_staging"
    fi
    
    # Create backup directory in pod
    kubectl exec "$db_pod" -n "$NAMESPACE" -- mkdir -p /tmp/backups
    
    # Create database dump
    if kubectl exec "$db_pod" -n "$NAMESPACE" -- pg_dump -U astralfield "$db_name" > "/tmp/${backup_name}.sql"; then
        log_success "Database backup created: ${backup_name}.sql"
        
        # Store backup name for potential restore
        echo "$backup_name" > "/tmp/astral_field_db_backup"
    else
        log_error "Failed to create database backup"
        exit 1
    fi
}

# Check pending migrations
check_pending_migrations() {
    log_info "Checking for pending migrations..."
    
    local app_pod
    app_pod=$(kubectl get pod -l app=astral-field-app -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')
    
    if [[ -z "$app_pod" ]]; then
        log_error "No application pod found"
        exit 1
    fi
    
    # Run Prisma migration status
    local migration_status
    migration_status=$(kubectl exec "$app_pod" -n "$NAMESPACE" -- npx prisma migrate status 2>&1 || true)
    
    if echo "$migration_status" | grep -q "No pending migrations"; then
        log_info "No pending migrations found"
        return 1
    elif echo "$migration_status" | grep -q "pending migration"; then
        log_info "Pending migrations found"
        echo "$migration_status"
        return 0
    else
        log_warning "Could not determine migration status"
        echo "$migration_status"
        return 0
    fi
}

# Run migrations
run_migrations() {
    log_info "Running database migrations..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Dry run mode - would run migrations now"
        return 0
    fi
    
    local app_pod
    app_pod=$(kubectl get pod -l app=astral-field-app -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')
    
    if [[ -z "$app_pod" ]]; then
        log_error "No application pod found"
        exit 1
    fi
    
    # Run migrations with timeout
    log_info "Executing migrations on pod: $app_pod"
    
    if timeout "$MIGRATION_TIMEOUT" kubectl exec "$app_pod" -n "$NAMESPACE" -- npm run db:migrate; then
        log_success "Database migrations completed successfully"
    else
        log_error "Database migrations failed or timed out"
        return 1
    fi
    
    # Verify migrations
    log_info "Verifying migrations..."
    local migration_status
    migration_status=$(kubectl exec "$app_pod" -n "$NAMESPACE" -- npx prisma migrate status 2>&1)
    
    if echo "$migration_status" | grep -q "Database schema is up to date"; then
        log_success "Database schema is up to date"
    else
        log_warning "Migration verification unclear:"
        echo "$migration_status"
    fi
}

# Run database health check after migration
post_migration_health_check() {
    log_info "Running post-migration health check..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Skipping health check in dry run mode"
        return 0
    fi
    
    local app_pod
    app_pod=$(kubectl get pod -l app=astral-field-app -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')
    
    # Test database connection
    if kubectl exec "$app_pod" -n "$NAMESPACE" -- node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.\$connect().then(() => {
            console.log('Database connection successful');
            return prisma.\$disconnect();
        }).catch((error) => {
            console.error('Database connection failed:', error);
            process.exit(1);
        });
    "; then
        log_success "Database connection test passed"
    else
        log_error "Database connection test failed"
        return 1
    fi
    
    # Test basic query
    if kubectl exec "$app_pod" -n "$NAMESPACE" -- node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.user.count().then((count) => {
            console.log('Basic query successful, user count:', count);
            return prisma.\$disconnect();
        }).catch((error) => {
            console.error('Basic query failed:', error);
            process.exit(1);
        });
    "; then
        log_success "Basic query test passed"
    else
        log_error "Basic query test failed"
        return 1
    fi
}

# Rollback migrations if needed
rollback_migrations() {
    log_error "Rolling back database migrations..."
    
    local backup_name
    if [[ -f "/tmp/astral_field_db_backup" ]]; then
        backup_name=$(cat /tmp/astral_field_db_backup)
        log_info "Restoring from backup: $backup_name"
        
        # This is a simplified rollback - in production, you might want more sophisticated rollback
        log_warning "Automatic rollback not implemented. Manual intervention required."
        log_warning "Backup file: ${backup_name}.sql"
    else
        log_error "No backup found for rollback"
    fi
}

# Cleanup temporary files
cleanup() {
    rm -f /tmp/astral_field_db_backup
}

# Main migration flow
main() {
    trap cleanup EXIT
    
    check_prerequisites
    check_db_connectivity
    
    # Check if migrations are needed
    if ! check_pending_migrations; then
        log_info "No migrations needed"
        exit 0
    fi
    
    # Create backup before migration
    backup_database
    
    # Run migrations
    if run_migrations && post_migration_health_check; then
        log_success "🎉 Database migration completed successfully!"
        exit 0
    else
        log_error "❌ Database migration failed!"
        
        if [[ "$BACKUP_BEFORE_MIGRATE" == "true" && "$DRY_RUN" != "true" ]]; then
            rollback_migrations
        fi
        
        exit 1
    fi
}

# Production safety check
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo ""
    log_warning "⚠️  PRODUCTION MIGRATION WARNING ⚠️"
    echo "You are about to run migrations on the PRODUCTION database."
    echo "This operation can be destructive and may cause downtime."
    echo ""
    echo "Please ensure:"
    echo "1. You have tested these migrations on staging"
    echo "2. You have a recent database backup"
    echo "3. You have planned for potential downtime"
    echo "4. You have rollback plan ready"
    echo ""
    
    if [[ "$DRY_RUN" != "true" ]]; then
        read -p "Are you sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Migration cancelled by user"
            exit 0
        fi
    fi
fi

# Run main function
main "$@"