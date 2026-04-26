#!/bin/bash

# Clear rate limit data from Redis
# Usage: ./clear-rate-limit.sh

echo "🔄 Clearing rate limit data from Redis..."

clear_redis() {
    local cmd=$1
    local label=$2
    
    echo "  Checking $label..."
    
    # Define patterns
    patterns=("*rate*" "*throttle*" "*limit*" "*bruteforce*")
    
    for pattern in "${patterns[@]}"; do
        count=$($cmd KEYS "$pattern" 2>/dev/null | wc -l)
        if [ "$count" -gt 0 ]; then
            $cmd --scan --pattern "$pattern" | xargs -r $cmd DEL 2>/dev/null
            echo "    Deleted $count keys matching $pattern"
        fi
    done
}

# 1. Try Docker Redis
if docker ps | grep -q talentsync-redis; then
    clear_redis "docker exec -i talentsync-redis redis-cli" "Docker Redis (talentsync-redis)"
fi

# 2. Try Host Redis (if exists)
if command -v redis-cli &> /dev/null; then
    # Check if host redis is running on default port
    if redis-cli PING &> /dev/null; then
        clear_redis "redis-cli" "Host Redis (localhost:6379)"
    fi
fi

echo "✅ Rate limits cleared!"
