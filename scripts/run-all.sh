#!/usr/bin/env bash
# Run and deploy all major scripts locally on Unix/macOS
# - Installs deps, type-checks, lints, tests, builds
# - Optionally builds and runs Docker Compose
# - Performs health check

set -euo pipefail

SKIP_TESTS=${SKIP_TESTS:-0}
SKIP_DOCKER=${SKIP_DOCKER:-0}

info() { echo -e "\033[0;34m[INFO]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
err()  { echo -e "\033[0;31m[ERROR]\033[0m $*"; }

cd "$(dirname "$0")/.."

# Preflight: node
if ! command -v node >/dev/null 2>&1; then
  err "Node.js not installed. Install LTS: https://nodejs.org/en/download"
  exit 1
fi
info "Node: $(node -v)"
info "npm:  $(npm -v)"

info "Installing dependencies (npm ci)"
 npm ci

info "Generating Prisma client"
 npm run db:generate || true

info "Type-checking"
 npm run type-check

info "Linting"
 npm run lint || warn "Lint reported issues"

if [ "$SKIP_TESTS" -eq 0 ]; then
  info "Running tests"
  npm run test
fi

info "Building Next.js app"
 npm run build

if [ "$SKIP_DOCKER" -eq 0 ]; then
  if ! command -v docker >/dev/null 2>&1; then
    warn "Docker not found; skipping container build/run."
  else
    info "Building production image"
    docker build -f docker/Dockerfile.production -t astral-field:prod .

    info "Starting docker-compose stack"
    docker compose -f docker/docker-compose.production.yml up -d

    sleep 10
  fi
fi

info "Health check"
if command -v curl >/dev/null 2>&1; then
  curl -i --max-time 10 http://localhost:3000/api/health || true
else
  warn "curl not found; skipping HTTP health check"
fi

info "All steps completed."
