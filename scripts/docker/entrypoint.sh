#!/bin/bash
# Docker entrypoint script for Astral Field main application
# Handles initialization and startup tasks

set -euo pipefail

# Functions
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >&2
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1"
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
                    process.exit(0);
                })
                .catch(() => {
                    console.log('Database connection failed');
                    process.exit(1);
                });
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
                .catch(() => {
                    console.log('Redis connection failed');
                    process.exit(1);
                });
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

# Run database migrations (only in staging/production with proper env var)
run_migrations() {
    if [[ "${RUN_MIGRATIONS:-false}" == "true" ]]; then
        log_info "Running database migrations..."
        
        if npx prisma migrate deploy; then
            log_success "Database migrations completed"
        else
            log_error "Database migrations failed"
            exit 1
        fi
    else
        log_info "Skipping database migrations (RUN_MIGRATIONS not set to true)"
    fi
}

# Seed database (only in development or if explicitly requested)
seed_database() {
    if [[ "${SEED_DATABASE:-false}" == "true" ]]; then
        log_info "Seeding database..."
        
        if npm run db:seed; then
            log_success "Database seeded"
        else
            log_error "Database seeding failed"
            exit 1
        fi
    else
        log_info "Skipping database seeding"
    fi
}

# Health check function
health_check() {
    log_info "Running startup health check..."
    
    # Check if Next.js can start
    if node -e "
        const next = require('next');
        const app = next({ dev: false });
        app.prepare()
            .then(() => {
                console.log('Next.js startup check successful');
                process.exit(0);
            })
            .catch((error) => {
                console.error('Next.js startup check failed:', error);
                process.exit(1);
            });
    "; then
        log_success "Application startup health check passed"
    else
        log_error "Application startup health check failed"
        exit 1
    fi
}

# Setup signal handlers for graceful shutdown
setup_signal_handlers() {
    trap 'log_info "Received SIGTERM, shutting down gracefully..."; exit 0' TERM
    trap 'log_info "Received SIGINT, shutting down gracefully..."; exit 0' INT
}

# Pre-start optimizations
pre_start_optimizations() {
    log_info "Running pre-start optimizations..."
    
    # Set Node.js optimizations
    export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=2048"
    
    # Optimize for production
    if [[ "${NODE_ENV:-}" == "production" ]]; then
        export NODE_OPTIONS="$NODE_OPTIONS --optimize-for-size"
    fi
    
    log_info "Node.js optimizations applied"
}

# Main startup sequence
main() {
    log_info "Starting Astral Field application..."
    log_info "Environment: ${NODE_ENV:-development}"
    log_info "Version: ${APP_VERSION:-unknown}"
    
    # Setup signal handlers
    setup_signal_handlers
    
    # Pre-start optimizations
    pre_start_optimizations
    
    # Wait for dependencies
    wait_for_database
    wait_for_redis
    
    # Setup application
    generate_prisma_client
    run_migrations
    seed_database
    
    # Final health check
    health_check
    
    log_success "Application startup completed successfully"
    log_info "Starting Next.js server..."
    
    # Start the application
    exec npm start
}

# Handle different startup modes
if [[ "${1:-}" == "bash" ]]; then
    # Debug mode - start bash instead of the app
    log_info "Starting in debug mode (bash)"
    exec bash
elif [[ "${1:-}" == "migrate" ]]; then
    # Migration only mode
    log_info "Running migrations only"
    wait_for_database
    generate_prisma_client
    npx prisma migrate deploy
    exit 0
elif [[ "${1:-}" == "seed" ]]; then
    # Seeding only mode
    log_info "Running database seed only"
    wait_for_database
    generate_prisma_client
    npm run db:seed
    exit 0
elif [[ "${1:-}" == "health" ]]; then
    # Health check only
    log_info "Running health check only"
    health_check
    exit 0
else
    # Normal startup
    main "$@"
fi