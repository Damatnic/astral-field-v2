#!/bin/bash
# Docker healthcheck script for Astral Field main application

set -euo pipefail

# Configuration
HEALTH_ENDPOINT="${HEALTH_ENDPOINT:-http://localhost:3000/api/health}"
TIMEOUT="${HEALTHCHECK_TIMEOUT:-10}"
MAX_RETRIES="${HEALTHCHECK_MAX_RETRIES:-3}"

# Functions
log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo "[HEALTHCHECK] $1"
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
            log_debug "Health check failed, retrying... ($count/$retries)"
            sleep 1
        else
            log_debug "Health check failed after $retries attempts"
            return $exit_code
        fi
    done
}

# Main health check
main() {
    log_debug "Running health check on $HEALTH_ENDPOINT"
    
    # Check if the health endpoint responds
    if retry_command curl -f -s --max-time "$TIMEOUT" "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
        log_debug "Health check passed"
        exit 0
    else
        log_debug "Health check failed"
        exit 1
    fi
}

main "$@"