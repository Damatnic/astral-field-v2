#!/bin/bash

echo "🔧 Setting up Vercel Environment Variables"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Read environment variables from .env.local
if [ ! -f ".env.local" ]; then
  echo -e "${YELLOW}⚠️ .env.local not found. Please create it first.${NC}"
  exit 1
fi

echo -e "${BLUE}📖 Reading environment variables from .env.local...${NC}"

# Source the environment variables
set -a
source .env.local
set +a

# Function to set environment variable in Vercel
set_vercel_env() {
  local key=$1
  local value=$2
  
  if [ -n "$value" ]; then
    echo "$value" | npx vercel env add "$key" production --yes 2>/dev/null || {
      echo "Updating existing variable: $key"
      npx vercel env rm "$key" production --yes 2>/dev/null
      echo "$value" | npx vercel env add "$key" production --yes
    }
    echo -e "${GREEN}✅ Set $key${NC}"
  else
    echo -e "${YELLOW}⚠️ Skipping empty variable: $key${NC}"
  fi
}

# Set all required environment variables
echo -e "${BLUE}🚀 Setting environment variables in Vercel...${NC}"

set_vercel_env "DATABASE_URL" "$DATABASE_URL"
set_vercel_env "DIRECT_DATABASE_URL" "${DIRECT_DATABASE_URL:-$DATABASE_URL}"
set_vercel_env "AUTH0_DOMAIN" "$AUTH0_DOMAIN"
set_vercel_env "AUTH0_CLIENT_ID" "$AUTH0_CLIENT_ID"
set_vercel_env "AUTH0_CLIENT_SECRET" "$AUTH0_CLIENT_SECRET"
set_vercel_env "AUTH0_AUDIENCE" "$AUTH0_AUDIENCE"
set_vercel_env "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
set_vercel_env "NEXTAUTH_URL" "https://astralfield-v2.vercel.app"
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

echo -e "${GREEN}✅ All environment variables configured!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "   1. Deploy with: npx vercel --prod"
echo "   2. Check variables: npx vercel env ls"
echo ""