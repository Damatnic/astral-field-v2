#!/bin/bash

echo "🚀 Setting up GitHub Repository"
echo "================================"

# Check if git is initialized
if [ ! -d ".git" ]; then
  echo "📝 Initializing git repository..."
  git init
fi

# Create .gitignore
cat > .gitignore << 'EOL'
# Dependencies
node_modules/
.pnp
.pnp.js
/.yarn

# Testing
coverage/
.nyc_output
*.lcov

# Next.js
.next/
out/
build/
dist/
.vercel

# Production
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Environment variables
.env
.env.local
.env.production.local
.env.development.local
.env.test.local

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store
Thumbs.db

# Database
*.db
*.sqlite
*.sqlite3
prisma/migrations/dev/

# Temporary files
tmp/
temp/
.tmp/

# Build files
*.tsbuildinfo
next-env.d.ts

# TypeScript
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# yarn v2
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*

# Sentry
.sentryclirc

# TailwindCSS
.tailwindcss-cache
EOL

echo "✅ Created .gitignore"

# Create comprehensive README
cat > README.md << 'EOL'
# 🏈 Fantasy Football Platform

A modern, full-stack fantasy football platform built with Next.js, TypeScript, and PostgreSQL. Features real-time ESPN data integration, 10-team league support, and a beautiful responsive interface.

## ✨ Features

### 🏆 League Management
- **10-Team League Support** - Complete league management system
- **Commissioner Tools** - Advanced admin capabilities for Nicholas D'Amato
- **Automated Draft System** - Snake draft with strategic AI algorithms
- **Trade Management** - Propose, review, and approve trades
- **Waiver Wire** - Rolling waiver system with priorities

### 📊 Data & Analytics
- **ESPN Integration** - Live NFL data with no API key required
- **Real-time Scoring** - Live score updates during games
- **Player Stats** - Comprehensive NFL player statistics
- **News Feed** - Latest NFL news and injury reports
- **Analytics Dashboard** - Advanced team and player analytics

### 🎮 User Experience
- **Mobile-First Design** - Responsive interface for all devices
- **Dark Mode Support** - Beautiful dark/light theme switching
- **Quick Login System** - Easy access for all 10 test users
- **Real-time Updates** - Live notifications and score updates
- **Progressive Web App** - Install as mobile app

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Radix UI** - Accessible component primitives

### Backend
- **Next.js API Routes** - Serverless backend
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Robust relational database (Neon)
- **Auth0** - Secure authentication system
- **SWR** - Data fetching and caching

### Infrastructure
- **Vercel** - Deployment and hosting
- **GitHub Actions** - CI/CD pipeline
- **ESPN API** - Free NFL data (no authentication required)
- **Neon Database** - Serverless PostgreSQL

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** - JavaScript runtime
- **PostgreSQL Database** - Neon or local instance
- **Auth0 Account** - For authentication (free tier)
- **Git** - Version control

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/fantasy-football-platform.git
cd fantasy-football-platform
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
Copy `.env.example` to `.env.local` and fill in your values:
```bash
cp .env.example .env.local
```

Required variables:
```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
DIRECT_DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
AUTH0_DOMAIN="your-domain.auth0.com"
AUTH0_CLIENT_ID="your-client-id"
AUTH0_CLIENT_SECRET="your-client-secret"
NEXTAUTH_URL="http://localhost:3007"
NEXTAUTH_SECRET="your-secret-key-here"
```

4. **Setup database**
```bash
npx prisma generate
npx prisma db push
```

5. **Create test league**
```bash
npm run setup:test-league
```

6. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:3007` to see the application.

## 🎮 Test League

The platform includes a complete 10-person test league with realistic data:

### 👥 Test Users
- **Nicholas D'Amato** (Commissioner) - D'Amato Dynasty 👑
- **Nick Hartley** - Hartley's Heroes
- **Jack McCaigue** - Jack Attack
- **Larry McCaigue** - Larry's Legends
- **Renee McCaigue** - Renee's Reign
- **Jon Kornbeck** - Kornbeck Crushers
- **David Jarvey** - Jarvey's Juggernauts
- **Kaity Lorbecki** - Kaity's Knights
- **Cason Minor** - Minor Threat
- **Brittany Bergum** - Bergum's Best

**Login Password:** `fantasy2025` (all users)

### 🏆 League Settings
- **Format:** 10-team PPR (Point Per Reception)
- **Season:** 2025 NFL Season, Week 3
- **Roster:** QB, RB, RB, WR, WR, TE, FLEX, K, DEF + 6 Bench + 1 IR
- **Playoffs:** 4 teams, Weeks 15-17
- **Scoring:** Standard PPR with defensive scoring

## 📝 Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Database
```bash
npm run prisma:generate     # Generate Prisma client
npm run prisma:push        # Push schema to database
npm run db:seed            # Seed database with test data
```

### Test League
```bash
npm run setup:test-league   # Create complete test league
npm run reset:test-league   # Reset and recreate test league
npm run quick-start         # Setup + start development
```

### Deployment
```bash
npm run deploy             # Complete deployment to Vercel
npm run deploy:github      # Setup GitHub repository
npm run deploy:vercel      # Deploy to Vercel
npm run health:check       # Check application health
```

## 🚀 Deployment

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/fantasy-football-platform)

### Manual Deployment

1. **Build the application**
```bash
npm run build
```

2. **Deploy to Vercel**
```bash
npm install -g vercel
vercel --prod
```

3. **Set environment variables in Vercel**
Add all required environment variables in the Vercel dashboard.

## 🏥 Health Monitoring

The application includes comprehensive health monitoring:

- **Health Check Endpoint:** `/api/health`
- **Database Status:** Connection and query testing
- **ESPN API Status:** External service availability
- **Authentication Status:** Auth0 configuration validation

Example health check response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-20T12:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": true,
    "espn": true,
    "auth": true
  },
  "errors": []
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `DIRECT_DATABASE_URL` | Direct database connection | ✅ |
| `AUTH0_DOMAIN` | Auth0 domain | ✅ |
| `AUTH0_CLIENT_ID` | Auth0 client ID | ✅ |
| `AUTH0_CLIENT_SECRET` | Auth0 client secret | ✅ |
| `NEXTAUTH_URL` | Application URL | ✅ |
| `NEXTAUTH_SECRET` | NextAuth secret key | ✅ |
| `ESPN_BASE_URL` | ESPN API base URL | ❌ |
| `NODE_ENV` | Environment mode | ❌ |

### Database Schema

The application uses Prisma with PostgreSQL. Key models:

- **User** - User accounts and profiles
- **League** - League settings and configuration
- **Team** - Fantasy teams and records
- **Player** - NFL players with ESPN data
- **Roster** - Team rosters and lineups
- **Matchup** - Weekly matchups and scores

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ESPN** - For providing free NFL data APIs
- **Neon** - For serverless PostgreSQL hosting
- **Vercel** - For seamless deployment platform
- **Auth0** - For robust authentication system
- **Next.js Team** - For the amazing React framework

## 📞 Support

- **Documentation:** [https://docs.yourapp.com](https://docs.yourapp.com)
- **Issues:** [GitHub Issues](https://github.com/yourusername/fantasy-football-platform/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/fantasy-football-platform/discussions)

---

Built with ❤️ for fantasy football enthusiasts
EOL

echo "✅ Created comprehensive README.md"

# Create environment example file
cat > .env.example << 'EOL'
# Database Configuration
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
DIRECT_DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Auth0 Configuration
AUTH0_DOMAIN="your-domain.auth0.com"
AUTH0_CLIENT_ID="your-auth0-client-id"
AUTH0_CLIENT_SECRET="your-auth0-client-secret"
AUTH0_AUDIENCE="https://your-app.com/api"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3007"
NEXTAUTH_SECRET="your-nextauth-secret-key-minimum-32-characters"

# ESPN API Configuration (Optional - has defaults)
ESPN_BASE_URL="https://site.api.espn.com/apis/site/v2/sports/football/nfl"
ESPN_FANTASY_URL="https://fantasy.espn.com/apis/v3/games/ffl"

# Application Configuration
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3007"

# Feature Flags
ENABLE_LIVE_SCORING="true"
ENABLE_NEWS_FEED="true"
ENABLE_PLAYER_SYNC="true"

# Data Refresh Intervals (milliseconds)
SCORE_REFRESH_INTERVAL="30000"
NEWS_REFRESH_INTERVAL="300000"
PLAYER_REFRESH_INTERVAL="86400000"
EOL

echo "✅ Created .env.example"

# Add git attributes file
cat > .gitattributes << 'EOL'
# Auto detect text files and perform LF normalization
* text=auto

# Custom for Visual Studio
*.cs     diff=csharp

# Standard to msysgit
*.doc    diff=astextplain
*.DOC    diff=astextplain
*.docx   diff=astextplain
*.DOCX   diff=astextplain
*.dot    diff=astextplain
*.DOT    diff=astextplain
*.pdf    diff=astextplain
*.PDF    diff=astextplain
*.rtf    diff=astextplain
*.RTF    diff=astextplain

# TypeScript
*.ts linguist-language=TypeScript
*.tsx linguist-language=TypeScript

# JavaScript
*.js linguist-language=JavaScript
*.jsx linguist-language=JavaScript

# Styles
*.css linguist-language=CSS
*.scss linguist-language=SCSS
*.sass linguist-language=SCSS

# Markdown
*.md linguist-language=Markdown

# Prisma
*.prisma linguist-language=JavaScript
EOL

echo "✅ Created .gitattributes"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
  echo "⚠️ GitHub CLI not found. Please install it from https://cli.github.com/"
  echo "For now, we'll setup the local repository."
fi

# Stage all files
echo "📦 Staging files for commit..."
git add .

# Create initial commit if there are changes
if git diff --staged --quiet; then
  echo "📝 No changes to commit"
else
  git commit -m "feat: Initial commit - Fantasy Football Platform

- Complete 10-person test league setup
- ESPN API integration (no auth required)
- Next.js 14 with TypeScript
- Prisma ORM with PostgreSQL
- Auth0 authentication
- Responsive mobile-first design
- Commissioner tools for Nicholas D'Amato
- Real-time scoring and updates
- Comprehensive test data and users"
  echo "✅ Created initial commit"
fi

# Try to create GitHub repository if CLI is available
if command -v gh &> /dev/null; then
  echo "📦 Creating GitHub repository..."
  
  # Check if user is authenticated
  if gh auth status &> /dev/null; then
    # Create repository
    gh repo create fantasy-football-platform \
      --public \
      --description "🏈 Modern fantasy football platform with ESPN integration, 10-team league support, and real-time scoring" \
      --add-readme=false \
      --clone=false 2>/dev/null || echo "Repository may already exist"
    
    # Get username
    USERNAME=$(gh api user -q .login 2>/dev/null || echo "yourusername")
    
    # Add remote origin
    git remote add origin "https://github.com/$USERNAME/fantasy-football-platform.git" 2>/dev/null || \
    git remote set-url origin "https://github.com/$USERNAME/fantasy-football-platform.git"
    
    # Push to GitHub
    echo "⬆️ Pushing to GitHub..."
    git branch -M main
    git push -u origin main --force 2>/dev/null && {
      echo "✅ Successfully pushed to GitHub!"
      echo "🔗 Repository: https://github.com/$USERNAME/fantasy-football-platform"
    } || {
      echo "⚠️ Push failed. You may need to authenticate with GitHub."
      echo "Run: gh auth login"
      echo "Then: git push -u origin main"
    }
  else
    echo "⚠️ Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    echo "Then run this script again"
  fi
else
  echo "ℹ️ To complete GitHub setup:"
  echo "1. Install GitHub CLI: https://cli.github.com/"
  echo "2. Run: gh auth login"
  echo "3. Create repository manually or run this script again"
fi

echo ""
echo "✅ GitHub repository setup complete!"
echo "📋 Next steps:"
echo "   1. Ensure GitHub repository is created"
echo "   2. Update environment variables"
echo "   3. Deploy to Vercel with: npm run deploy:vercel"
echo ""