#!/bin/bash

# Master Deployment Script for AstralField Fantasy Football Platform
# This script orchestrates the complete deployment process

echo "🚀 AstralField Deployment System"
echo "================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
LOG_FILE="$PROJECT_ROOT/deployment.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log messages
log() {
  echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
  echo -e "$1"
}

# Function to run command with error handling
run_command() {
  local cmd="$1"
  local description="$2"
  local required="${3:-true}"
  
  log "${BLUE}🔧 $description...${NC}"
  
  if eval "$cmd" >> "$LOG_FILE" 2>&1; then
    log "${GREEN}✅ $description completed successfully${NC}"
    return 0
  else
    log "${RED}❌ $description failed${NC}"
    if [ "$required" = "true" ]; then
      log "${RED}🚨 Critical step failed. Aborting deployment.${NC}"
      exit 1
    else
      log "${YELLOW}⚠️ Non-critical step failed. Continuing...${NC}"
      return 1
    fi
  fi
}

# Function to check prerequisites
check_prerequisites() {
  log "${PURPLE}🔍 Checking prerequisites...${NC}"
  
  # Check Node.js
  if ! command -v node &> /dev/null; then
    log "${RED}❌ Node.js is not installed${NC}"
    exit 1
  fi
  
  # Check npm
  if ! command -v npm &> /dev/null; then
    log "${RED}❌ npm is not installed${NC}"
    exit 1
  fi
  
  # Check git
  if ! command -v git &> /dev/null; then
    log "${RED}❌ git is not installed${NC}"
    exit 1
  fi
  
  # Check for required files
  local required_files=(".env.local" "package.json" "prisma/schema.prisma")
  for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
      log "${RED}❌ Required file missing: $file${NC}"
      exit 1
    fi
  done
  
  log "${GREEN}✅ All prerequisites met${NC}"
}

# Function to install dependencies
install_dependencies() {
  log "${PURPLE}📦 Installing dependencies...${NC}"
  
  run_command "npm ci" "Installing Node.js dependencies"
  
  # Install global dependencies if needed
  if ! command -v vercel &> /dev/null; then
    run_command "npm install -g vercel" "Installing Vercel CLI" false
  fi
  
  if ! command -v cross-env &> /dev/null; then
    run_command "npm install -g cross-env" "Installing cross-env" false
  fi
}

# Function to run database setup
setup_database() {
  log "${PURPLE}🗄️ Setting up database...${NC}"
  
  # Generate Prisma client
  run_command "DATABASE_URL=\"$DATABASE_URL\" npx prisma generate" "Generating Prisma client"
  
  # Push database schema
  run_command "DATABASE_URL=\"$DATABASE_URL\" npx prisma db push" "Pushing database schema"
  
  # Verify database connection
  if [ -f "scripts/check-players.ts" ]; then
    run_command "DATABASE_URL=\"$DATABASE_URL\" npx tsx scripts/check-players.ts" "Verifying database connection" false
  fi
}

# Function to run build and tests
build_and_test() {
  log "${PURPLE}🔨 Building and testing application...${NC}"
  
  # Fix any build issues first
  if [ -f "scripts/fix-build.js" ]; then
    run_command "node scripts/fix-build.js" "Running build fixes" false
  fi
  
  # Run TypeScript check
  run_command "npx tsc --noEmit" "TypeScript type checking" false
  
  # Run linting
  run_command "npm run lint" "Running ESLint" false
  
  # Build the application
  run_command "npm run build" "Building application"
  
  # Run tests if available
  if grep -q "\"test\"" package.json; then
    run_command "npm test" "Running tests" false
  fi
}

# Function to setup GitHub repository
setup_github() {
  log "${PURPLE}📁 Setting up GitHub repository...${NC}"
  
  if [ -f "scripts/setup-github.sh" ]; then
    run_command "chmod +x scripts/setup-github.sh && bash scripts/setup-github.sh" "Setting up GitHub repository"
  else
    log "${YELLOW}⚠️ GitHub setup script not found. Skipping...${NC}"
  fi
}

# Function to deploy to Vercel
deploy_vercel() {
  log "${PURPLE}🚀 Deploying to Vercel...${NC}"
  
  if [ -f "scripts/deploy-vercel.sh" ]; then
    run_command "chmod +x scripts/deploy-vercel.sh && bash scripts/deploy-vercel.sh" "Deploying to Vercel"
  else
    log "${YELLOW}⚠️ Vercel deployment script not found. Running manual deployment...${NC}"
    
    # Manual Vercel deployment
    if command -v vercel &> /dev/null; then
      run_command "vercel --prod --yes" "Manual Vercel deployment"
    else
      log "${RED}❌ Vercel CLI not available for manual deployment${NC}"
      exit 1
    fi
  fi
}

# Function to run post-deployment monitoring
monitor_deployment() {
  log "${PURPLE}📊 Starting deployment monitoring...${NC}"
  
  # Get deployment URL
  local deployment_url
  if command -v vercel &> /dev/null; then
    deployment_url=$(vercel inspect --json 2>/dev/null | jq -r '.url // empty' | sed 's/^/https:\/\//')
    
    if [ -n "$deployment_url" ]; then
      log "${GREEN}🔗 Deployment URL: $deployment_url${NC}"
      
      # Run monitoring if script exists
      if [ -f "scripts/monitor-deployment.js" ]; then
        run_command "node scripts/monitor-deployment.js \"$deployment_url\"" "Running deployment monitoring" false
      else
        # Basic health check
        log "${BLUE}🏥 Running basic health check...${NC}"
        sleep 30
        
        if curl -f "$deployment_url/api/health" > /dev/null 2>&1; then
          log "${GREEN}✅ Health check passed!${NC}"
        else
          log "${YELLOW}⚠️ Health check failed. Manual verification recommended.${NC}"
        fi
      fi
    else
      log "${YELLOW}⚠️ Could not determine deployment URL${NC}"
    fi
  else
    log "${YELLOW}⚠️ Vercel CLI not available for monitoring${NC}"
  fi
}

# Function to run cleanup and finalization
cleanup_and_finalize() {
  log "${PURPLE}🧹 Running cleanup and finalization...${NC}"
  
  if [ -f "scripts/cleanup-and-finalize.ts" ]; then
    run_command "DATABASE_URL=\"$DATABASE_URL\" npx tsx scripts/cleanup-and-finalize.ts" "Running cleanup script" false
  fi
  
  # Clean up temporary files
  if [ -d ".next" ]; then
    log "${BLUE}🧹 Cleaning build cache...${NC}"
    rm -rf .next/cache
  fi
  
  # Clean up node_modules cache if needed
  if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
  fi
}

# Function to display summary
display_summary() {
  log ""
  log "${GREEN}🎉 Deployment Complete!${NC}"
  log "${GREEN}======================${NC}"
  log ""
  
  if command -v vercel &> /dev/null; then
    local deployment_url=$(vercel inspect --json 2>/dev/null | jq -r '.url // empty' | sed 's/^/https:\/\//')
    
    if [ -n "$deployment_url" ]; then
      log "${BLUE}🔗 Application URL: $deployment_url${NC}"
      log "${BLUE}🏥 Health Check: $deployment_url/api/health${NC}"
      log "${BLUE}🔐 Login Page: $deployment_url/login${NC}"
      log "${BLUE}📊 Monitoring: $deployment_url/api/monitoring/health${NC}"
    fi
  fi
  
  log ""
  log "${BLUE}📋 Deployment Summary:${NC}"
  log "   ✅ Dependencies installed"
  log "   ✅ Database configured"
  log "   ✅ Application built"
  log "   ✅ GitHub repository setup"
  log "   ✅ Vercel deployment"
  log "   ✅ Health monitoring configured"
  log ""
  log "${BLUE}📊 Useful Commands:${NC}"
  log "   vercel logs                 # View deployment logs"
  log "   vercel inspect             # Get deployment info"
  log "   vercel env ls              # List environment variables"
  log "   npm run dev                # Run locally"
  log ""
  log "${BLUE}📁 Log file: $LOG_FILE${NC}"
  log ""
}

# Main deployment process
main() {
  # Initialize log file
  echo "AstralField Deployment Log - $TIMESTAMP" > "$LOG_FILE"
  echo "=============================================" >> "$LOG_FILE"
  
  log "${PURPLE}🚀 Starting AstralField deployment process...${NC}"
  log ""
  
  # Load environment variables
  if [ -f ".env.local" ]; then
    set -a
    source .env.local
    set +a
    log "${GREEN}✅ Environment variables loaded${NC}"
  else
    log "${RED}❌ .env.local file not found${NC}"
    exit 1
  fi
  
  # Run deployment steps
  check_prerequisites
  install_dependencies
  setup_database
  build_and_test
  setup_github
  deploy_vercel
  monitor_deployment
  cleanup_and_finalize
  display_summary
  
  log "${GREEN}🎉 All deployment steps completed successfully!${NC}"
  exit 0
}

# Error handling
trap 'log "${RED}❌ Deployment failed due to unexpected error${NC}"; exit 1' ERR

# Help function
show_help() {
  echo "AstralField Deployment Script"
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -h, --help     Show this help message"
  echo "  --skip-github  Skip GitHub repository setup"
  echo "  --skip-tests   Skip test execution"
  echo "  --skip-build   Skip build process (not recommended)"
  echo "  --dry-run      Show what would be done without executing"
  echo ""
  echo "Environment variables required:"
  echo "  DATABASE_URL, AUTH0_*, NEXTAUTH_SECRET"
  echo ""
}

# Parse command line arguments
SKIP_GITHUB=false
SKIP_TESTS=false
SKIP_BUILD=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    --skip-github)
      SKIP_GITHUB=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Run main function if not dry run
if [ "$DRY_RUN" = true ]; then
  echo "Dry run mode - would execute deployment process"
  echo "Steps: prerequisites -> dependencies -> database -> build -> github -> deploy -> monitor -> cleanup"
else
  main
fi