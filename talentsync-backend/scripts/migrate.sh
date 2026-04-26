#!/bin/bash
# ============================================
# TALENTSYNC DATABASE MIGRATION SCRIPT
# ============================================
# Safe migration execution with pre-migration backup
# Usage: ./migrate.sh [environment] [--dry-run]
# Example: ./migrate.sh production --dry-run
# ============================================

set -e

# Configuration
ENVIRONMENT=${1:-"development"}
DRY_RUN=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Load environment
if [ -f ".env.${ENVIRONMENT}" ]; then
    source ".env.${ENVIRONMENT}"
elif [ -f ".env" ]; then
    source ".env"
fi

if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL environment variable is not set"
    exit 1
fi

log_info "Migration script for environment: $ENVIRONMENT"

if [ "$DRY_RUN" = true ]; then
    log_warn "Running in DRY-RUN mode - no changes will be made"
fi

# Step 1: Validate schema
log_step "1/5 Validating Prisma schema..."
npx prisma validate
log_info "Schema validation passed ✓"

# Step 2: Check pending migrations
log_step "2/5 Checking for pending migrations..."
PENDING=$(npx prisma migrate status 2>&1 || true)

if echo "$PENDING" | grep -q "Database schema is up to date"; then
    log_info "No pending migrations"
    exit 0
fi

log_warn "Pending migrations detected"
echo "$PENDING"

# Step 3: For production, create backup first
if [ "$ENVIRONMENT" = "production" ] && [ "$DRY_RUN" = false ]; then
    log_step "3/5 Creating pre-migration backup..."
    ./scripts/backup-db.sh production
    log_info "Backup created ✓"
else
    log_step "3/5 Skipping backup (non-production or dry-run)"
fi

# Step 4: Show migration diff
log_step "4/5 Showing migration diff..."
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma || true

# Step 5: Apply migrations
if [ "$DRY_RUN" = true ]; then
    log_step "5/5 DRY RUN - would execute: npx prisma migrate deploy"
    log_info "Dry run completed. No changes made."
else
    if [ "$ENVIRONMENT" = "production" ]; then
        log_warn "⚠️  About to apply migrations to PRODUCTION"
        read -p "Type 'MIGRATE' to proceed: " CONFIRM
        if [ "$CONFIRM" != "MIGRATE" ]; then
            log_error "Migration cancelled"
            exit 1
        fi
    fi

    log_step "5/5 Applying migrations..."
    
    # Run migration with error handling
    if npx prisma migrate deploy; then
        log_info "Migrations applied successfully ✓"
    else
        log_error "Migration failed!"
        log_error "Check logs and consider restoring from backup"
        exit 1
    fi
fi

log_info "Migration process completed!"
