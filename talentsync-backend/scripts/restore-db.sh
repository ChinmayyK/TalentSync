#!/bin/bash
# ============================================
# TALENTSYNC DATABASE RESTORE SCRIPT
# ============================================
# Usage: ./restore-db.sh <backup_file> [environment]
# Example: ./restore-db.sh backups/talentsync_production_20231219.sql.gz staging
# ============================================

set -e

# Configuration
BACKUP_FILE=$1
ENVIRONMENT=${2:-"development"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check arguments
if [ -z "$BACKUP_FILE" ]; then
    log_error "Usage: ./restore-db.sh <backup_file> [environment]"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    source ".env.${ENVIRONMENT}"
elif [ -f ".env" ]; then
    source ".env"
fi

if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL environment variable is not set"
    exit 1
fi

# Extract connection details
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Safety confirmation for production
if [ "$ENVIRONMENT" == "production" ]; then
    log_warn "⚠️  YOU ARE ABOUT TO RESTORE TO PRODUCTION DATABASE!"
    log_warn "Database: $DB_NAME @ $DB_HOST:$DB_PORT"
    log_warn "Backup file: $BACKUP_FILE"
    echo ""
    read -p "Type 'CONFIRM' to proceed: " CONFIRM
    if [ "$CONFIRM" != "CONFIRM" ]; then
        log_error "Restore cancelled"
        exit 1
    fi
fi

# Verify checksum if available
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
    log_info "Verifying backup checksum..."
    if sha256sum -c "$CHECKSUM_FILE" > /dev/null 2>&1; then
        log_info "Checksum verified ✓"
    else
        log_error "Checksum verification failed!"
        exit 1
    fi
else
    log_warn "No checksum file found, skipping verification"
fi

log_info "Starting restore for environment: $ENVIRONMENT"
log_info "Database: $DB_NAME @ $DB_HOST:$DB_PORT"
log_info "Backup file: $BACKUP_FILE"

# Create pre-restore backup
log_info "Creating pre-restore backup..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PRE_RESTORE_BACKUP="backups/talentsync_${ENVIRONMENT}_pre_restore_${TIMESTAMP}.sql.gz"
mkdir -p backups
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    | gzip > "$PRE_RESTORE_BACKUP"
log_info "Pre-restore backup created: $PRE_RESTORE_BACKUP"

# Restore database
log_info "Restoring database..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --quiet

log_info "Database restored successfully!"

# Run migrations to ensure schema is up to date
log_info "Running migrations..."
npx prisma migrate deploy

log_info "Restore completed successfully!"
log_info "Pre-restore backup saved at: $PRE_RESTORE_BACKUP"
