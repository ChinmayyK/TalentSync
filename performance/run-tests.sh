#!/bin/bash

# Performance Testing Runner Script
# Runs all performance tests and generates final report

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}       🚀 LINEUP PERFORMANCE TEST SUITE                    ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Create results directory
mkdir -p results

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${YELLOW}⚠️  k6 not found. Skipping API load tests.${NC}"
    echo -e "${YELLOW}   Install with: brew install k6${NC}"
    SKIP_K6=true
else
    SKIP_K6=false
fi

# Check if backend is running
if ! curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend not running on port 4000${NC}"
    echo -e "${YELLOW}   Run: cd ../lineup-backend && npm run start:dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"

# Check if frontend is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Frontend not running on port 3000${NC}"
    echo -e "${YELLOW}   Page load tests may fail${NC}"
fi

echo ""
echo -e "${BLUE}Starting performance tests...${NC}"
echo ""

# ============================================
# 1. API Load Test (k6)
# ============================================
if [ "$SKIP_K6" = false ]; then
    echo -e "${YELLOW}📊 Running API Load Tests (k6)...${NC}"
    k6 run api-load-test.js --out json=results/api-load-raw.json 2>&1 || true
    echo ""
else
    echo -e "${YELLOW}📊 Skipping API Load Tests (k6 not installed)${NC}"
    # Create placeholder result
    echo '{"metrics":{"httpReqDuration":{"p95":0},"errorRate":0},"passed":false,"note":"k6 not installed"}' > results/api-load-results.json
fi

# ============================================
# 2. Database Benchmark
# ============================================
echo -e "${YELLOW}🔬 Running Database Benchmarks...${NC}"
cd "$SCRIPT_DIR/../lineup-backend"
npx ts-node "$SCRIPT_DIR/db-benchmark.ts" 2>&1 || true
cd "$SCRIPT_DIR"
echo ""

# ============================================
# 3. Page Load Tests
# ============================================
echo -e "${YELLOW}🌐 Running Page Load Tests...${NC}"
cd "$SCRIPT_DIR/../lineup-backend"
npx ts-node "$SCRIPT_DIR/page-load-test.ts" 2>&1 || true
cd "$SCRIPT_DIR"
echo ""

# ============================================
# 4. Uptime Simulation (shortened for testing)
# ============================================
echo -e "${YELLOW}🔍 Running Uptime Simulation...${NC}"
cd "$SCRIPT_DIR/../lineup-backend"
# Run a shorter version for quick testing
timeout 60 npx ts-node "$SCRIPT_DIR/uptime-monitor.ts" 2>&1 || true
cd "$SCRIPT_DIR"
echo ""

# ============================================
# 5. Generate Final Report
# ============================================
echo -e "${YELLOW}📋 Generating Final Report...${NC}"
cd "$SCRIPT_DIR/../lineup-backend"
npx ts-node "$SCRIPT_DIR/generate-report.ts" 2>&1 || true
cd "$SCRIPT_DIR"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}       ✅ PERFORMANCE TESTS COMPLETE                       ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "📁 Results saved to:"
echo -e "   ${GREEN}performance/results/performance-report.md${NC}"
echo -e "   ${GREEN}performance/results/performance-report.json${NC}"
echo ""
