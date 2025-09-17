# Run and deploy all major scripts locally on Windows (PowerShell)
# - Installs dependencies
# - Type-checks, lints, tests
# - Builds Next.js
# - Optionally builds and runs Docker Compose
# - Runs health check

param(
  [switch]$SkipTests,
  [switch]$SkipDocker
)

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[ERROR] $msg" -ForegroundColor Red }

Set-Location (Resolve-Path "$PSScriptRoot\..")

# Preflight: Node
Write-Info "Checking Node.js installation..."
try {
  $nodeVersion = node -v
  Write-Info "Node: $nodeVersion"
} catch {
  Write-Err "Node.js is not installed. Install LTS from https://nodejs.org/en/download and re-run."
  exit 1
}

# Preflight: npm
try {
  $npmVersion = npm -v
  Write-Info "npm: $npmVersion"
} catch {
  Write-Err "npm not found in PATH. Ensure Node.js installation is complete."
  exit 1
}

# Install deps
Write-Info "Installing dependencies (npm ci)..."
npm ci
if ($LASTEXITCODE -ne 0) { Write-Err "npm ci failed"; exit 1 }

# Generate Prisma client (safe even if DB not reachable)
Write-Info "Generating Prisma client..."
npm run db:generate

# Type check
Write-Info "Type-checking..."
npm run type-check
if ($LASTEXITCODE -ne 0) { Write-Err "Type-check failed"; exit 1 }

# Lint
Write-Info "Linting..."
npm run lint
if ($LASTEXITCODE -ne 0) { Write-Warn "Lint reported issues" }

# Tests
if (-not $SkipTests) {
  Write-Info "Running tests..."
  npm run test
  if ($LASTEXITCODE -ne 0) { Write-Err "Tests failed"; exit 1 }
}

# Build
Write-Info "Building Next.js app..."
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "Build failed"; exit 1 }

# Docker (optional)
if (-not $SkipDocker) {
  Write-Info "Checking Docker installation..."
  try {
    $dockerVersion = docker --version
    Write-Info $dockerVersion
  } catch {
    Write-Warn "Docker not found; skipping container build/run. Install Docker Desktop to enable."
    $SkipDocker = $true
  }
}

if (-not $SkipDocker) {
  Write-Info "Building production image..."
  docker build -f docker/Dockerfile.production -t astral-field:prod .
  if ($LASTEXITCODE -ne 0) { Write-Err "Docker image build failed"; exit 1 }

  Write-Info "Starting docker-compose stack..."
  docker compose -f docker/docker-compose.production.yml up -d
  if ($LASTEXITCODE -ne 0) { Write-Err "Docker compose up failed"; exit 1 }

  Start-Sleep -Seconds 10
}

# Health check (node or docker)
Write-Info "Running health check..."
try {
  $resp = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 10
  Write-Host $resp.StatusCode $resp.StatusDescription
  Write-Host $resp.Content
} catch {
  Write-Warn "Health check failed: $_"
}

Write-Info "All steps completed."
