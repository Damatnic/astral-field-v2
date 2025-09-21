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
