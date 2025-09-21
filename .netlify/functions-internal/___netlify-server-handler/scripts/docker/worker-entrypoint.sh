#!/bin/bash
# Docker entrypoint script for Astral Field background worker

set -euo pipefail

# Functions
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WORKER] [INFO] $1"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WORKER] [ERROR] $1" >&2
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WORKER] [SUCCESS] $1"
}

# Wait for database to be ready
wait_for_database() {
    log_info "Waiting for database connection..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if node -e "
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            prisma.\$connect()
                .then(() => {
                    console.log('Database connection successful');
                    return prisma.\$disconnect();
                })
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
        " 2>/dev/null; then
            log_success "Database is ready"
            return 0
        fi
        
        log_info "Database not ready, attempt $attempt/$max_attempts"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "Database connection timeout after $max_attempts attempts"
    exit 1
}

# Wait for Redis to be ready
wait_for_redis() {
    log_info "Waiting for Redis connection..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if node -e "
            const Redis = require('ioredis');
            const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
            redis.ping()
                .then(() => {
                    console.log('Redis connection successful');
                    redis.disconnect();
                    process.exit(0);
                })
                .catch(() => process.exit(1));
        " 2>/dev/null; then
            log_success "Redis is ready"
            return 0
        fi
        
        log_info "Redis not ready, attempt $attempt/$max_attempts"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "Redis connection timeout after $max_attempts attempts"
    exit 1
}

# Generate Prisma client if needed
generate_prisma_client() {
    log_info "Generating Prisma client..."
    
    if npx prisma generate; then
        log_success "Prisma client generated"
    else
        log_error "Failed to generate Prisma client"
        exit 1
    fi
}

# Setup signal handlers for graceful shutdown
setup_signal_handlers() {
    trap 'log_info "Received SIGTERM, shutting down gracefully..."; kill -TERM $worker_pid 2>/dev/null || true; wait $worker_pid 2>/dev/null || true; exit 0' TERM
    trap 'log_info "Received SIGINT, shutting down gracefully..."; kill -INT $worker_pid 2>/dev/null || true; wait $worker_pid 2>/dev/null || true; exit 0' INT
}

# Worker health check
worker_health_check() {
    log_info "Running worker health check..."
    
    # Check if worker process is responsive
    if node -e "
        const Redis = require('ioredis');
        const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
        
        // Test basic Redis operations
        redis.set('worker:health:check', Date.now(), 'EX', 60)
            .then(() => redis.get('worker:health:check'))
            .then((result) => {
                if (result) {
                    console.log('Worker health check passed');
                    redis.disconnect();
                    process.exit(0);
                } else {
                    throw new Error('Health check key not found');
                }
            })
            .catch((error) => {
                console.error('Worker health check failed:', error);
                redis.disconnect();
                process.exit(1);
            });
    "; then
        log_success "Worker health check passed"
    else
        log_error "Worker health check failed"
        exit 1
    fi
}

# Pre-start optimizations
pre_start_optimizations() {
    log_info "Running worker pre-start optimizations..."
    
    # Set Node.js optimizations for worker
    export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=1024"
    
    # Set worker-specific environment variables
    export WORKER_CONCURRENCY="${WORKER_CONCURRENCY:-5}"
    export WORKER_MAX_RETRIES="${WORKER_MAX_RETRIES:-3}"
    export WORKER_RETRY_DELAY="${WORKER_RETRY_DELAY:-5000}"
    
    log_info "Worker concurrency: $WORKER_CONCURRENCY"
    log_info "Worker optimizations applied"
}

# Main startup sequence
main() {
    log_info "Starting Astral Field background worker..."
    log_info "Environment: ${NODE_ENV:-development}"
    log_info "Version: ${APP_VERSION:-unknown}"
    
    # Setup signal handlers
    setup_signal_handlers
    
    # Pre-start optimizations
    pre_start_optimizations
    
    # Wait for dependencies
    wait_for_database
    wait_for_redis
    
    # Setup worker
    generate_prisma_client
    
    # Health check
    worker_health_check
    
    log_success "Worker startup completed successfully"
    log_info "Starting background job processor..."
    
    # Start the worker process
    node dist/worker/index.js &
    worker_pid=$!
    
    # Wait for worker process
    wait $worker_pid
}

# Handle different startup modes
if [[ "${1:-}" == "bash" ]]; then
    # Debug mode - start bash instead of worker
    log_info "Starting in debug mode (bash)"
    exec bash
elif [[ "${1:-}" == "health" ]]; then
    # Health check only
    log_info "Running health check only"
    wait_for_redis
    worker_health_check
    exit 0
else
    # Normal startup
    main "$@"
fi