#!/bin/bash
# ============================================
# TALENTSYNC DATABASE BACKUP SCRIPT
# ============================================
# Usage: ./backup-db.sh [environment]
# Example: ./backup-db.sh production
# ============================================

set -e

# Configuration
ENVIRONMENT=${1:-"development"}
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS=${RETENTION_DAYS:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="talentsync_${ENVIRONMENT}_${TIMESTAMP}.sql.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    source ".env.${ENVIRONMENT}"
elif [ -f ".env" ]; then
    source ".env"
fi

# Parse DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL environment variable is not set"
    exit 1
fi

# Extract connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Create backup directory
mkdir -p "$BACKUP_DIR"

log_info "Starting backup for environment: $ENVIRONMENT"
log_info "Database: $DB_NAME @ $DB_HOST:$DB_PORT"
log_info "Backup file: $BACKUP_FILE"

# Perform backup
log_info "Creating backup..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# Verify backup
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
log_info "Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)"

# Create checksum
sha256sum "$BACKUP_DIR/$BACKUP_FILE" > "$BACKUP_DIR/$BACKUP_FILE.sha256"
log_info "Checksum created: $BACKUP_FILE.sha256"

# Clean old backups
log_info "Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "talentsync_${ENVIRONMENT}_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "talentsync_${ENVIRONMENT}_*.sql.gz.sha256" -mtime +$RETENTION_DAYS -delete

# List recent backups
log_info "Recent backups:"
ls -lh "$BACKUP_DIR" | grep "talentsync_${ENVIRONMENT}" | tail -5

log_info "Backup completed successfully!"

# Optional: Upload to S3 or other storage
# if [ -n "$BACKUP_S3_BUCKET" ]; then
#     log_info "Uploading to S3..."
#     aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$BACKUP_S3_BUCKET/backups/$BACKUP_FILE"
#     aws s3 cp "$BACKUP_DIR/$BACKUP_FILE.sha256" "s3://$BACKUP_S3_BUCKET/backups/$BACKUP_FILE.sha256"
# fi
