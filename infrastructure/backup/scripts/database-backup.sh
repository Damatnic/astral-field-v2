#!/bin/bash
# Quantum's Advanced Database Backup Script

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
LOG_FILE="/var/log/backup/postgres-backup-$(date +%Y%m%d).log"
BACKUP_DIR="/backups/postgres"
RETENTION_DAYS=30
S3_BUCKET="astralfield-db-backups"
S3_PREFIX="postgres/production"

# Encryption
GPG_RECIPIENT="backup@astralfield.com"
ENCRYPTION_ENABLED=${ENCRYPTION_ENABLED:-true}

# Notification
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
EMAIL_RECIPIENTS="${EMAIL_RECIPIENTS:-devops@astralfield.com}"

# Metrics
PROMETHEUS_GATEWAY="${PROMETHEUS_GATEWAY:-http://prometheus-pushgateway:9091}"

# Functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "${LOG_FILE}" >&2
}

send_metric() {
    local metric_name="$1"
    local metric_value="$2"
    local metric_type="${3:-gauge}"
    
    if [[ -n "${PROMETHEUS_GATEWAY}" ]]; then
        cat <<EOF | curl -X POST --data-binary @- "${PROMETHEUS_GATEWAY}/metrics/job/database_backup/instance/$(hostname)"
# TYPE ${metric_name} ${metric_type}
${metric_name} ${metric_value}
EOF
    fi
}

send_notification() {
    local status="$1"
    local message="$2"
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
        local color="good"
        local emoji="✅"
        
        if [[ "${status}" != "success" ]]; then
            color="danger"
            emoji="❌"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"${color}\",
                    \"title\": \"${emoji} Database Backup ${status}\",
                    \"text\": \"${message}\",
                    \"fields\": [{
                        \"title\": \"Environment\",
                        \"value\": \"Production\",
                        \"short\": true
                    }, {
                        \"title\": \"Timestamp\",
                        \"value\": \"$(date -u '+%Y-%m-%d %H:%M:%S UTC')\",
                        \"short\": true
                    }]
                }]
            }" "${SLACK_WEBHOOK_URL}"
    fi
    
    # Email notification
    if command -v mail &> /dev/null; then
        echo "${message}" | mail -s "Database Backup ${status}" "${EMAIL_RECIPIENTS}"
    fi
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check required commands
    local required_commands=("pg_dump" "pg_dumpall" "aws" "gzip")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "${cmd}" &> /dev/null; then
            error "Required command '${cmd}' not found"
            exit 1
        fi
    done
    
    # Check backup directory
    mkdir -p "${BACKUP_DIR}"
    mkdir -p "$(dirname "${LOG_FILE}")"
    
    # Check database connectivity
    if ! pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}"; then
        error "Cannot connect to PostgreSQL database"
        exit 1
    fi
    
    log "Prerequisites check completed"
}

backup_database() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${BACKUP_DIR}/astralfield_${timestamp}.sql"
    local globals_file="${BACKUP_DIR}/globals_${timestamp}.sql"
    local compressed_file="${backup_file}.gz"
    local globals_compressed="${globals_file}.gz"
    
    log "Starting database backup..."
    local start_time=$(date +%s)
    
    # Backup main database
    log "Backing up main database..."
    if ! pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" \
         -d "${POSTGRES_DB}" \
         --verbose \
         --no-password \
         --format=custom \
         --compress=9 \
         --create \
         --clean \
         --if-exists \
         --quote-all-identifiers \
         > "${backup_file}"; then
        error "Database backup failed"
        send_metric "backup_database_success" 0
        return 1
    fi
    
    # Backup global objects (roles, tablespaces, etc.)
    log "Backing up global objects..."
    if ! pg_dumpall -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" \
         --globals-only \
         --verbose \
         --no-password \
         > "${globals_file}"; then
        error "Global objects backup failed"
        send_metric "backup_database_success" 0
        return 1
    fi
    
    # Compress backups
    log "Compressing backup files..."
    gzip "${backup_file}" || { error "Failed to compress database backup"; return 1; }
    gzip "${globals_file}" || { error "Failed to compress globals backup"; return 1; }
    
    # Encrypt if enabled
    if [[ "${ENCRYPTION_ENABLED}" == "true" ]]; then
        log "Encrypting backup files..."
        if command -v gpg &> /dev/null; then
            gpg --trust-model always --encrypt --recipient "${GPG_RECIPIENT}" \
                --output "${compressed_file}.gpg" "${compressed_file}" && rm "${compressed_file}"
            gpg --trust-model always --encrypt --recipient "${GPG_RECIPIENT}" \
                --output "${globals_compressed}.gpg" "${globals_compressed}" && rm "${globals_compressed}"
            
            compressed_file="${compressed_file}.gpg"
            globals_compressed="${globals_compressed}.gpg"
        else
            log "GPG not available, skipping encryption"
        fi
    fi
    
    # Calculate backup size and duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local backup_size=$(du -b "${compressed_file}" | cut -f1)
    local globals_size=$(du -b "${globals_compressed}" | cut -f1)
    local total_size=$((backup_size + globals_size))
    
    # Upload to S3
    log "Uploading backup to S3..."
    local s3_key_db="${S3_PREFIX}/$(basename "${compressed_file}")"
    local s3_key_globals="${S3_PREFIX}/$(basename "${globals_compressed}")"
    
    if ! aws s3 cp "${compressed_file}" "s3://${S3_BUCKET}/${s3_key_db}" \
         --storage-class STANDARD_IA \
         --metadata "timestamp=${timestamp},environment=production,type=database"; then
        error "Failed to upload database backup to S3"
        send_metric "backup_s3_upload_success" 0
        return 1
    fi
    
    if ! aws s3 cp "${globals_compressed}" "s3://${S3_BUCKET}/${s3_key_globals}" \
         --storage-class STANDARD_IA \
         --metadata "timestamp=${timestamp},environment=production,type=globals"; then
        error "Failed to upload globals backup to S3"
        send_metric "backup_s3_upload_success" 0
        return 1
    fi
    
    # Send metrics
    send_metric "backup_database_success" 1
    send_metric "backup_duration_seconds" "${duration}"
    send_metric "backup_size_bytes" "${total_size}"
    send_metric "backup_s3_upload_success" 1
    
    log "Database backup completed successfully"
    log "Duration: ${duration} seconds"
    log "Size: $(numfmt --to=iec "${total_size}")"
    log "S3 Location: s3://${S3_BUCKET}/${s3_key_db}"
    
    # Store backup metadata
    cat > "${BACKUP_DIR}/backup_${timestamp}.json" <<EOF
{
    "timestamp": "${timestamp}",
    "duration_seconds": ${duration},
    "size_bytes": ${total_size},
    "database_file": "$(basename "${compressed_file}")",
    "globals_file": "$(basename "${globals_compressed}")",
    "s3_bucket": "${S3_BUCKET}",
    "s3_key_database": "${s3_key_db}",
    "s3_key_globals": "${s3_key_globals}",
    "encrypted": ${ENCRYPTION_ENABLED},
    "environment": "production"
}
EOF
    
    # Clean up local files older than retention period
    cleanup_old_backups
    
    return 0
}

cleanup_old_backups() {
    log "Cleaning up old backup files..."
    
    # Local cleanup
    find "${BACKUP_DIR}" -name "*.sql.gz*" -mtime +${RETENTION_DAYS} -delete || true
    find "${BACKUP_DIR}" -name "*.json" -mtime +${RETENTION_DAYS} -delete || true
    
    # S3 cleanup (files older than retention period)
    local cutoff_date=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" --recursive | \
        while read -r line; do
            local s3_file=$(echo "${line}" | awk '{print $4}')
            local file_date=$(echo "${s3_file}" | grep -oP '\d{8}')
            
            if [[ -n "${file_date}" && "${file_date}" -lt "${cutoff_date}" ]]; then
                log "Deleting old S3 backup: ${s3_file}"
                aws s3 rm "s3://${S3_BUCKET}/${s3_file}"
            fi
        done
    
    log "Cleanup completed"
}

verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup integrity..."
    
    # Basic file validation
    if [[ ! -f "${backup_file}" ]]; then
        error "Backup file not found: ${backup_file}"
        return 1
    fi
    
    # Check if it's a valid PostgreSQL backup
    if [[ "${backup_file}" == *.gz ]]; then
        if ! gzip -t "${backup_file}"; then
            error "Backup file is corrupted (gzip test failed)"
            return 1
        fi
    fi
    
    log "Backup verification completed"
    return 0
}

main() {
    log "=== Starting Quantum Database Backup ==="
    
    # Load environment variables
    source "${SCRIPT_DIR}/../configs/backup.env" 2>/dev/null || true
    
    # Check prerequisites
    check_prerequisites
    
    # Perform backup
    if backup_database; then
        send_notification "success" "Database backup completed successfully"
        log "=== Backup completed successfully ==="
        exit 0
    else
        send_notification "failed" "Database backup failed - check logs for details"
        error "=== Backup failed ==="
        exit 1
    fi
}

# Handle signals
trap 'error "Backup interrupted"; send_notification "interrupted" "Database backup was interrupted"; exit 130' INT TERM

# Run main function
main "$@"