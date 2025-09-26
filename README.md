# 🏈 AstralField v3.0 - Complete Fantasy Football Platform

> **Production Ready ✅** - A comprehensive, real-time fantasy football platform built with Next.js 14, TypeScript, and modern web technologies.

![AstralField Banner](https://img.shields.io/badge/Status-Production%20Ready-brightgreen) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue) ![Prisma](https://img.shields.io/badge/Prisma-5.7-indigo) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-white)

## 🚀 **What is AstralField?**

AstralField is a **complete, production-ready fantasy football platform** that provides everything needed for a professional fantasy sports experience:

- 🏆 **Complete League Management** - Create and manage fantasy leagues
- 📊 **Live Scoring & Analytics** - Real-time game updates and insights  
- 🤖 **AI Coach** - Smart recommendations and lineup optimization
- 💬 **Real-time Chat** - League communication and trash talk
- 📱 **Mobile Ready** - Fully responsive across all devices
- 🔐 **Secure Authentication** - Email/password + OAuth integration

## ✨ **Key Features**

### **🏈 Core Fantasy Football**
- **Team Management** - Complete roster and lineup control
- **Live Draft Rooms** - Real-time drafting with timers and notifications
- **Live Scoring** - Game-day updates with play-by-play scoring
- **Trade System** - Proposal, negotiation, and completion workflows
- **Waiver Wire** - Automated claim processing and priority
- **Player Database** - 500+ NFL players with stats and projections

### **🚀 Advanced Features**
- **AI-Powered Insights** - Smart lineup recommendations and trade analysis
- **Real-time Communication** - WebSocket-powered chat and notifications
- **Analytics Dashboard** - Performance metrics and trend analysis
- **Mobile Optimization** - PWA-ready responsive design
- **Multi-League Support** - Manage multiple leagues simultaneously

### **💡 Modern Tech Stack**
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Prisma ORM, PostgreSQL
- **Real-time**: Socket.IO for live features
- **Authentication**: NextAuth 5.0 with OAuth providers
- **Testing**: Jest, Testing Library, Playwright E2E
- **Deployment**: Vercel/Netlify ready with Docker support

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
