#!/bin/bash

echo "🏈 Setting up 10-Person Test League"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Installing dependencies...${NC}"
npm install

echo -e "${BLUE}🗄️ Setting up database...${NC}"
npx prisma db push --accept-data-loss

echo -e "${BLUE}👥 Creating test league with 10 users...${NC}"
npx tsx scripts/seed-test-league.ts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Setup complete!${NC}"
    echo ""
    echo -e "${YELLOW}📝 League Details:${NC}"
    echo "- League: Test League 2025"
    echo "- Commissioner: Nicholas D'Amato"
    echo "- Current Week: 3"
    echo "- Teams: 10"
    echo ""
    echo -e "${YELLOW}🔐 Login Info:${NC}"
    echo "All users can login with password: fantasy2025"
    echo ""
    echo -e "${YELLOW}👑 Test Users:${NC}"
    echo "1. Nicholas D'Amato (Commissioner) - D'Amato Dynasty"
    echo "2. Nick Hartley - Hartley's Heroes"
    echo "3. Jack McCaigue - Jack Attack"
    echo "4. Larry McCaigue - Larry's Legends"
    echo "5. Renee McCaigue - Renee's Reign"
    echo "6. Jon Kornbeck - Kornbeck Crushers"
    echo "7. David Jarvey - Jarvey's Juggernauts"
    echo "8. Kaity Lorbecki - Kaity's Knights"
    echo "9. Cason Minor - Minor Threat"
    echo "10. Brittany Bergum - Bergum's Best"
    echo ""
    echo -e "${GREEN}🚀 Ready to start!${NC}"
    echo "Run: npm run dev"
    echo "Then go to: http://localhost:3007/login"
else
    echo -e "${RED}❌ Setup failed. Please check the error messages above.${NC}"
    exit 1
fi