#!/bin/bash

# Clear database and reseed
# Usage: ./clear-db.sh

echo "⚠️  This will DELETE all data from the database!"
read -p "Are you sure? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "🗑️  Clearing database..."

cd talentsync-backend

# Reset database (drops all tables and recreates)
npx prisma migrate reset --force

echo ""
echo "🌱 Seeding database..."
npx prisma db seed

echo ""
echo "✅ Database cleared and reseeded!"
