#!/bin/bash

echo "🚀 Deploying to Vercel"
echo "======================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo -e "${BLUE}📦 Installing Vercel CLI...${NC}"
  npm install -g vercel
fi

# Login to Vercel (if not already)
echo -e "${BLUE}🔐 Checking Vercel authentication...${NC}"
if ! vercel whoami &> /dev/null; then
  echo -e "${YELLOW}Please login to Vercel:${NC}"
  vercel login
fi

# Link project (if not already linked)
if [ ! -d ".vercel" ]; then
  echo -e "${BLUE}🔗 Linking to Vercel project...${NC}"
  vercel link --yes
fi

# Function to set environment variable in Vercel
set_vercel_env() {
  local key=$1
  local value=$2
  local env_type=${3:-production}
  
  if [ -n "$value" ]; then
    echo "$value" | vercel env add "$key" "$env_type" --yes 2>/dev/null || {
      echo "Updating existing variable: $key"
      vercel env rm "$key" "$env_type" --yes 2>/dev/null
      echo "$value" | vercel env add "$key" "$env_type" --yes 2>/dev/null
    }
    echo -e "${GREEN}✅ Set $key${NC}"
  else
    echo -e "${YELLOW}⚠️ Skipping empty variable: $key${NC}"
  fi
}

# Set environment variables in Vercel
echo -e "${BLUE}🔧 Setting environment variables...${NC}"

# Read from .env.local if it exists
if [ -f ".env.local" ]; then
  echo -e "${BLUE}Reading from .env.local...${NC}"
  
  # Export variables from .env.local (excluding comments and empty lines)
  set -a
  source <(grep -v '^#\|^$' .env.local)
  set +a
  
  # Set each variable in Vercel
  set_vercel_env "DATABASE_URL" "$DATABASE_URL"
  set_vercel_env "DIRECT_DATABASE_URL" "${DIRECT_DATABASE_URL:-$DATABASE_URL}"
  set_vercel_env "AUTH0_DOMAIN" "$AUTH0_DOMAIN"
  set_vercel_env "AUTH0_CLIENT_ID" "$AUTH0_CLIENT_ID"
  set_vercel_env "AUTH0_CLIENT_SECRET" "$AUTH0_CLIENT_SECRET"
  set_vercel_env "AUTH0_AUDIENCE" "$AUTH0_AUDIENCE"
  set_vercel_env "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
  set_vercel_env "ESPN_BASE_URL" "${ESPN_BASE_URL:-https://site.api.espn.com/apis/site/v2/sports/football/nfl}"
  set_vercel_env "ESPN_FANTASY_URL" "${ESPN_FANTASY_URL:-https://fantasy.espn.com/apis/v3/games/ffl}"
  set_vercel_env "NODE_ENV" "production"
  set_vercel_env "NEXT_TELEMETRY_DISABLED" "1"
  set_vercel_env "ENABLE_LIVE_SCORING" "${ENABLE_LIVE_SCORING:-true}"
  set_vercel_env "ENABLE_NEWS_FEED" "${ENABLE_NEWS_FEED:-true}"
  set_vercel_env "ENABLE_PLAYER_SYNC" "${ENABLE_PLAYER_SYNC:-true}"
  set_vercel_env "SCORE_REFRESH_INTERVAL" "${SCORE_REFRESH_INTERVAL:-30000}"
  set_vercel_env "NEWS_REFRESH_INTERVAL" "${NEWS_REFRESH_INTERVAL:-300000}"
  set_vercel_env "PLAYER_REFRESH_INTERVAL" "${PLAYER_REFRESH_INTERVAL:-86400000}"
else
  echo -e "${RED}❌ .env.local not found. Please create it with required environment variables.${NC}"
  exit 1
fi

# Get deployment URL for NEXTAUTH_URL
echo -e "${BLUE}🔍 Getting deployment URL...${NC}"
PROJECT_URL=$(vercel inspect --json 2>/dev/null | jq -r '.url // empty')
if [ -n "$PROJECT_URL" ]; then
  set_vercel_env "NEXTAUTH_URL" "https://$PROJECT_URL"
  set_vercel_env "NEXT_PUBLIC_APP_URL" "https://$PROJECT_URL"
  echo -e "${GREEN}✅ Set NEXTAUTH_URL to https://$PROJECT_URL${NC}"
else
  echo -e "${YELLOW}⚠️ Could not determine project URL. NEXTAUTH_URL will need to be set manually.${NC}"
fi

# Build locally first to catch errors
echo -e "${BLUE}🔨 Building project locally...${NC}"
if npm run build; then
  echo -e "${GREEN}✅ Local build successful${NC}"
else
  echo -e "${RED}❌ Local build failed. Attempting to fix...${NC}"
  
  # Try to fix build issues
  if [ -f "scripts/fix-build.js" ]; then
    node scripts/fix-build.js
  fi
  
  # Try building again
  if npm run build; then
    echo -e "${GREEN}✅ Build fixed and successful${NC}"
  else
    echo -e "${RED}❌ Build still failing. Please check the errors above.${NC}"
    exit 1
  fi
fi

# Deploy to Vercel
echo -e "${BLUE}🚀 Deploying to production...${NC}"
echo -e "${YELLOW}This may take a few minutes...${NC}"

DEPLOYMENT_OUTPUT=$(vercel --prod --yes 2>&1)
DEPLOYMENT_URL=$(echo "$DEPLOYMENT_OUTPUT" | grep -o 'https://[^[:space:]]*' | tail -1)

if [ $? -eq 0 ] && [ -n "$DEPLOYMENT_URL" ]; then
  echo -e "${GREEN}✅ Deployment initiated successfully!${NC}"
  echo -e "${GREEN}🔗 Deployment URL: $DEPLOYMENT_URL${NC}"
  
  # Update NEXTAUTH_URL with actual deployment URL if different
  if [[ "$DEPLOYMENT_URL" != *"$PROJECT_URL"* ]]; then
    FINAL_URL=$(echo "$DEPLOYMENT_URL" | sed 's|https://||')
    set_vercel_env "NEXTAUTH_URL" "https://$FINAL_URL"
    set_vercel_env "NEXT_PUBLIC_APP_URL" "https://$FINAL_URL"
    echo -e "${GREEN}✅ Updated NEXTAUTH_URL to $DEPLOYMENT_URL${NC}"
  fi
  
  # Start monitoring deployment if script exists
  if [ -f "scripts/monitor-deployment.js" ]; then
    echo -e "${BLUE}📊 Starting deployment monitoring...${NC}"
    node scripts/monitor-deployment.js "$DEPLOYMENT_URL"
  else
    echo -e "${YELLOW}⚠️ Deployment monitor not found. Manual verification recommended.${NC}"
    echo -e "${BLUE}🔍 Check deployment status at: $DEPLOYMENT_URL${NC}"
    
    # Simple health check
    echo -e "${BLUE}🏥 Performing basic health check...${NC}"
    sleep 30  # Wait for deployment to be ready
    
    if curl -f "$DEPLOYMENT_URL/api/health" > /dev/null 2>&1; then
      echo -e "${GREEN}✅ Health check passed!${NC}"
    else
      echo -e "${YELLOW}⚠️ Health check failed. Please verify deployment manually.${NC}"
    fi
  fi
  
else
  echo -e "${RED}❌ Deployment failed!${NC}"
  echo "Error output:"
  echo "$DEPLOYMENT_OUTPUT"
  exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment process complete!${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo "   1. Verify the application at: $DEPLOYMENT_URL"
echo "   2. Test login functionality"
echo "   3. Check health endpoint: $DEPLOYMENT_URL/api/health"
echo "   4. Monitor logs in Vercel dashboard"
echo ""
echo -e "${BLUE}📊 Useful commands:${NC}"
echo "   vercel logs                 # View deployment logs"
echo "   vercel inspect             # Get deployment info"
echo "   vercel env ls              # List environment variables"
echo ""