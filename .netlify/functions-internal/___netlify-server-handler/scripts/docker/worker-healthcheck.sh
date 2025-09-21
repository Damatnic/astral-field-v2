#!/bin/bash
# Docker healthcheck script for Astral Field background worker

set -euo pipefail

# Configuration
TIMEOUT="${WORKER_HEALTHCHECK_TIMEOUT:-10}"
MAX_RETRIES="${WORKER_HEALTHCHECK_MAX_RETRIES:-3}"

# Functions
log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo "[WORKER-HEALTHCHECK] $1"
    fi
}

# Retry wrapper
retry_command() {
    local retries=$MAX_RETRIES
    local count=0
    until "$@"; do
        exit_code=$?
        count=$((count + 1))
        if [[ $count -lt $retries ]]; then
            log_debug "Worker health check failed, retrying... ($count/$retries)"
            sleep 1
        else
            log_debug "Worker health check failed after $retries attempts"
            return $exit_code
        fi
    done
}

# Check if worker process is running
check_worker_process() {
    log_debug "Checking if worker process is running"
    
    # Check if Node.js worker process is running
    if pgrep -f "node dist/worker/index.js" > /dev/null 2>&1; then
        log_debug "Worker process is running"
        return 0
    else
        log_debug "Worker process is not running"
        return 1
    fi
}

# Check Redis connectivity for worker
check_redis_connectivity() {
    log_debug "Checking Redis connectivity for worker"
    
    # Test Redis connection with timeout
    if timeout "$TIMEOUT" node -e "
        const Redis = require('ioredis');
        const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
        
        redis.ping()
            .then(() => {
                console.log('Redis connection successful');
                redis.disconnect();
                process.exit(0);
            })
            .catch((error) => {
                console.error('Redis connection failed:', error);
                redis.disconnect();
                process.exit(1);
            });
    " 2>/dev/null; then
        log_debug "Redis connectivity check passed"
        return 0
    else
        log_debug "Redis connectivity check failed"
        return 1
    fi
}

# Check worker queue status
check_worker_queue_status() {
    log_debug "Checking worker queue status"
    
    # Test if worker can interact with job queues
    if timeout "$TIMEOUT" node -e "
        const Redis = require('ioredis');
        const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
        
        // Test basic queue operations
        const healthKey = 'worker:health:' + Date.now();
        
        redis.lpush(healthKey, 'health-check')
            .then(() => redis.llen(healthKey))
            .then((length) => {
                if (length > 0) {
                    return redis.del(healthKey);
                } else {
                    throw new Error('Queue operation failed');
                }
            })
            .then(() => {
                console.log('Queue operations successful');
                redis.disconnect();
                process.exit(0);
            })
            .catch((error) => {
                console.error('Queue operations failed:', error);
                redis.disconnect();
                process.exit(1);
            });
    " 2>/dev/null; then
        log_debug "Worker queue status check passed"
        return 0
    else
        log_debug "Worker queue status check failed"
        return 1
    fi
}

# Main health check
main() {
    log_debug "Running worker health check"
    
    # Check worker process
    if ! retry_command check_worker_process; then
        log_debug "Worker process health check failed"
        exit 1
    fi
    
    # Check Redis connectivity
    if ! retry_command check_redis_connectivity; then
        log_debug "Redis connectivity health check failed"
        exit 1
    fi
    
    # Check worker queue operations
    if ! retry_command check_worker_queue_status; then
        log_debug "Worker queue status health check failed"
        exit 1
    fi
    
    log_debug "All worker health checks passed"
    exit 0
}

main "$@"