# ⚡ Astral Field - Next-Generation Fantasy Football Platform

> **A modern, AI-powered fantasy football platform that surpasses Yahoo and ESPN with superior technology and user experience.**

[![CI](https://github.com/your-org/astral-field-v2.1/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/astral-field-v2.1/actions/workflows/ci.yml)
[![Deploy Production](https://github.com/your-org/astral-field-v2.1/actions/workflows/deploy-production.yml/badge.svg)](https://github.com/your-org/astral-field-v2.1/actions/workflows/deploy-production.yml)
[![Performance Tests](https://github.com/your-org/astral-field-v2.1/actions/workflows/performance-tests.yml/badge.svg)](https://github.com/your-org/astral-field-v2.1/actions/workflows/performance-tests.yml)

## 🚀 Features

### 🎯 Core Fantasy Features
- **Real-time Live Scoring** with WebSocket updates
- **AI-Powered Recommendations** using Anthropic Claude
- **Advanced Trade Analysis** with fairness scoring
- **FAAB Waiver System** with competitive bidding
- **Multi-League Management** with seamless switching
- **Commissioner Tools** with automated league management
- **Draft Optimization** with AI-assisted picks

### 📱 Modern User Experience
- **Drag & Drop Interface** for lineup management
- **Mobile-First Design** with PWA capabilities
- **Real-Time Notifications** via push and in-app
- **Social Features** with league chat and activity feeds
- **Advanced Analytics** with performance insights
- **Dark/Light Mode** with user preferences

### 🏗️ Enterprise Architecture
- **Next.js 14** with App Router and Server Components
- **TypeScript** for type safety
- **PostgreSQL** with Prisma ORM
- **Redis** for caching and real-time features
- **Socket.IO** for real-time communication
- **Bull/BullMQ** for background job processing

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **@hello-pangea/dnd** - Drag and drop functionality
- **Socket.IO Client** - Real-time communication

### Backend
- **Node.js** - JavaScript runtime
- **Prisma** - Next-generation ORM
- **PostgreSQL** - Relational database
- **Redis** - In-memory data store
- **Socket.IO** - Real-time engine
- **Bull/BullMQ** - Job queue system

### AI & External APIs
- **Anthropic Claude** - AI recommendations
- **NFL API** - Live sports data
- **Sleeper API** - Fantasy sports integration
- **Auth0** - Authentication and authorization

### DevOps & Deployment
- **Docker** - Containerization
- **Kubernetes** - Container orchestration
- **GitHub Actions** - CI/CD pipeline
- **Prometheus** - Monitoring
- **Grafana** - Visualization
- **Sentry** - Error tracking

## 🏃‍♂️ Quick Start

### Prerequisites
- **Node.js 18+** (LTS recommended)
- **PostgreSQL 14+** (or cloud provider like Neon, Supabase)
- **Redis** (or Upstash for serverless)
- **Git** for version control

### Development Setup

```bash
# Clone the repository
git clone https://github.com/astralfield/astral-field-v2.1.git
cd astral-field-v2.1

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env.local

# Configure your database and services in .env.local
# See Environment Configuration section below

# Generate Prisma client and run migrations
npm run db:generate
npm run db:migrate:dev

# Seed the database with demo data
npm run db:seed

# Start the development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

### Environment Configuration

**Required Environment Variables:**

Create a `.env.local` file with these essential variables:

```bash
# ===========================================
# REQUIRED FOR DEVELOPMENT
# ===========================================

# Database (Required)
DATABASE_URL="postgresql://user:password@localhost:5432/astralfield_dev"
DATABASE_URL_UNPOOLED="postgresql://user:password@localhost:5432/astralfield_dev"

# Authentication (Required)
NEXTAUTH_SECRET="your-nextauth-secret-min-32-characters-long"
NEXTAUTH_URL="http://localhost:3000"

# AI Services (Required for full functionality)  
ANTHROPIC_API_KEY="your-anthropic-api-key"

# ===========================================
# OPTIONAL FOR ENHANCED FEATURES
# ===========================================

# Auth0 (for social login)
AUTH0_SECRET="your-auth0-secret"
AUTH0_BASE_URL="http://localhost:3000"
AUTH0_ISSUER_BASE_URL="https://your-domain.auth0.com"
AUTH0_CLIENT_ID="your-auth0-client-id"
AUTH0_CLIENT_SECRET="your-auth0-client-secret"

# Redis (for caching and real-time features)
REDIS_URL="redis://localhost:6379"

# Sports Data APIs
SPORTSDATA_API_KEY="your-sportsdata-api-key"
NFL_API_KEY="your-nfl-api-key"

# Email (for notifications)
RESEND_API_KEY="your-resend-api-key"

# Monitoring (optional)
NEXT_PUBLIC_SENTRY_DSN="your-sentry-dsn"
```

**For complete environment setup**, see the `.env.example` file which includes all available configuration options.

### Database Setup Options

#### Option 1: Local PostgreSQL
```bash
# Install PostgreSQL locally
# macOS
brew install postgresql
brew services start postgresql

# Create database
createdb astralfield_dev

# Update .env.local with your local database URL
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/astralfield_dev"
```

#### Option 2: Cloud Database (Recommended)
**Neon (Serverless PostgreSQL):**
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string to your `.env.local`

**Supabase:**
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > Database and copy the connection string

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/astralfield/astral-field-v2.1)

#### Manual Deployment Steps:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
npm run deploy:staging  # For staging
npm run deploy          # For production

# Configure environment variables
vercel env add PRODUCTION    # Add production environment variables
vercel env add PREVIEW      # Add preview environment variables
```

### Docker Setup (Alternative)

```bash
# Development with Docker
npm run docker:dev

# Production with Docker
npm run docker:prod

# Build custom image
npm run docker:build
```

## 🚀 Production Deployment

### Vercel Deployment (Recommended)

AstralField is optimized for Vercel deployment with zero configuration needed.

#### Step 1: Prepare Your Repository
```bash
# Ensure your code is in a Git repository
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### Step 2: Deploy to Vercel
```bash
# Option A: Use Vercel CLI
npm i -g vercel
vercel --prod

# Option B: Connect GitHub to Vercel
# 1. Go to https://vercel.com
# 2. Connect your GitHub repository
# 3. Vercel will auto-deploy on pushes to main
```

#### Step 3: Configure Environment Variables
In your Vercel dashboard, add these required variables:

**Required Variables:**
```bash
DATABASE_URL=postgresql://user:password@host/database
DATABASE_URL_UNPOOLED=postgresql://user:password@host/database
NEXTAUTH_SECRET=your-32-char-secret
NEXTAUTH_URL=https://your-domain.vercel.app
ANTHROPIC_API_KEY=your-api-key
```

**Recommended Variables:**
```bash
REDIS_URL=redis://your-redis-host
SENTRY_DSN=your-sentry-dsn
RESEND_API_KEY=your-email-api-key
```

### Database Setup for Production

#### Option 1: Neon Database (Recommended)
```bash
# 1. Create account at neon.tech
# 2. Create new project
# 3. Copy connection strings
# 4. Add to Vercel environment variables

DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/astralfield?sslmode=require&pgbouncer=true"
DATABASE_URL_UNPOOLED="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/astralfield?sslmode=require"
```

#### Option 2: Supabase Database
```bash
# 1. Create account at supabase.com  
# 2. Create new project
# 3. Go to Settings > Database
# 4. Copy connection string and add to Vercel
```

### Production Migration

```bash
# Run production migrations (one time)
npm run db:migrate:deploy

# Seed production data (optional)
npm run db:seed:prod --env production --force
```

### Alternative Deployment Options

#### Docker Deployment
```bash
# Build production image
docker build -t astralfield-prod .

# Run with environment file
docker run -p 3000:3000 --env-file .env.production astralfield-prod
```

#### Self-Hosted Deployment
```bash
# Build for production
npm run build

# Start production server
npm start

# Or with PM2 for process management
npm install -g pm2
pm2 start npm --name "astralfield" -- start
```

### CI/CD Pipeline

Our automated CI/CD pipeline includes:

- **Continuous Integration**: Tests, linting, security scans
- **Staging Deployment**: Automatic deployment on `develop` branch  
- **Production Deployment**: Controlled deployment on `main` branch
- **Performance Testing**: Lighthouse, load testing, memory analysis
- **Monitoring**: Health checks, error tracking, performance metrics

### Post-Deployment Checklist

After deploying to production:

- [ ] **Health Check**: Visit `/api/health` to verify deployment
- [ ] **Database Check**: Verify database connection and migrations
- [ ] **Authentication**: Test login/registration flows
- [ ] **API Integration**: Verify external API connections
- [ ] **Performance**: Check Core Web Vitals and response times
- [ ] **Monitoring**: Configure alerts and error tracking
- [ ] **SSL**: Ensure HTTPS is working properly
- [ ] **Domain**: Configure custom domain if needed

### Production Monitoring

```bash
# Monitor application logs
vercel logs --follow

# Check function performance
vercel logs --function=api/scores

# Monitor database performance
npm run db:health:detailed

# Performance testing
npm run perf:production
```

## 🛠️ Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Test database connection
npm run db:health

# Check environment variables
echo $DATABASE_URL

# Reset database (development only)
npm run db:reset
```

#### Build Failures
```bash
# Clear cache and rebuild
npm run clean
npm install
npm run build

# Check for TypeScript errors
npm run type-check

# Fix linting issues
npm run lint:fix
```

#### Environment Variable Issues
```bash
# Pull latest environment variables from Vercel
npm run env:pull

# List all environment variables
npm run env:list

# Verify required variables are set
node -e "console.log(process.env.DATABASE_URL ? '✅ DATABASE_URL' : '❌ DATABASE_URL missing')"
```

#### Performance Issues
```bash
# Run performance diagnostics
npm run perf:test

# Check database performance
npm run perf:test:database

# Analyze bundle size
npm run build:analyze
```

### Development Tips

**Database Schema Changes:**
```bash
# After modifying schema.prisma
npm run db:generate      # Regenerate Prisma client
npm run db:migrate:dev   # Create and apply migration
```

**Testing Changes:**
```bash
# Run full test suite
npm run test:ci

# Run specific tests
npm test -- --testNamePattern="User"

# Run E2E tests
npm run test:e2e
```

**Performance Monitoring:**
```bash
# Monitor in development
npm run dev
# Visit http://localhost:3000 and open browser dev tools

# Check Core Web Vitals
npm run perf:test:quick
```

### Getting Help

- **Documentation**: Read the full docs in the `/docs` folder
- **Issues**: [GitHub Issues](https://github.com/astralfield/astral-field-v2.1/issues)
- **Discussions**: [GitHub Discussions](https://github.com/astralfield/astral-field-v2.1/discussions)
- **Discord**: Join our [Discord Community](https://discord.gg/astralfield)
- **Email**: support@astralfield.com

## 📊 Performance & Monitoring

### Performance Metrics
- **Page Load Time**: < 2 seconds
- **API Response Time**: < 500ms
- **Real-time Updates**: < 30 seconds
- **Cache Hit Rate**: > 90%
- **Uptime**: 99.9%

### Monitoring Stack
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards and visualization
- **Loki**: Log aggregation
- **Sentry**: Error tracking and performance monitoring
- **Health Checks**: Automated system health verification

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run performance tests
npm run perf:test

# Run load tests
npm run perf:test:load

# Run database performance tests
npm run perf:test:database
```

### Testing Strategy
- **Unit Tests**: Jest with React Testing Library
- **Integration Tests**: API and database testing
- **E2E Tests**: Playwright for critical user journeys
- **Performance Tests**: Lighthouse CI and load testing
- **Security Tests**: Automated vulnerability scanning

## 📖 Documentation

### Architecture Guides
- [CI/CD Setup Guide](CI_CD_SETUP_GUIDE.md) - Complete deployment pipeline
- [Original Deployment Guide](DEPLOYMENT_GUIDE.md) - Vercel deployment
- [API Documentation](docs/api/) - REST API reference
- [Database Schema](docs/database/) - Data model documentation

### Development Guides
- [Contributing Guidelines](CONTRIBUTING.md)
- [Code Style Guide](docs/style-guide.md)
- [Testing Guidelines](docs/testing.md)
- [Security Guidelines](docs/security.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for your changes
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 🔧 Scripts Reference

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

### Database
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database

### Testing & Performance
- `npm test` - Run all tests
- `npm run test:coverage` - Run tests with coverage
- `npm run perf:test` - Run performance tests
- `npm run perf:analyze` - Analyze bundle size

### Deployment
- `./scripts/deploy/deploy.sh` - Main deployment script
- `./scripts/deploy/rollback.sh` - Emergency rollback
- `./scripts/deploy/health-check.sh` - Health verification
- `./scripts/deploy/database-migrate.sh` - Database migrations

## 🌟 Why Astral Field?

### Advantages Over Competitors

| Feature | Astral Field | Yahoo Fantasy | ESPN Fantasy |
|---------|-------------|--------------|-------------|
| **Real-time Updates** | < 30 seconds | 2-5 minutes | 2-5 minutes |
| **AI Recommendations** | ✅ Advanced | ❌ None | ❌ Basic |
| **Mobile Experience** | ✅ Native-like | ❌ Clunky | ❌ Outdated |
| **Drag & Drop** | ✅ Smooth | ❌ Limited | ❌ Buggy |
| **Performance** | ✅ < 2s load | ❌ 5+ seconds | ❌ 4+ seconds |
| **Modern Tech Stack** | ✅ Latest | ❌ Legacy | ❌ Legacy |
| **Customization** | ✅ Extensive | ❌ Limited | ❌ Limited |

### Key Differentiators
- **6x Faster Updates** than competitors
- **AI-Powered Insights** not available elsewhere  
- **Modern Mobile Experience** with PWA capabilities
- **Enterprise-Grade Infrastructure** with 99.9% uptime
- **Open Source** with community-driven development

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** - Amazing React framework
- **Prisma Team** - Excellent database toolkit
- **Anthropic** - Powerful AI capabilities
- **Vercel** - Seamless deployment platform
- **Community Contributors** - Thank you for your contributions!

## 📞 Support

- **Documentation**: [CI/CD Setup Guide](CI_CD_SETUP_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/your-org/astral-field-v2.1/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/astral-field-v2.1/discussions)
- **Email**: support@astralfield.com

---

<div align="center">

**⚡ Built with modern technology to deliver the future of fantasy football ⚡**

[Live Demo](https://astralfield.com) • [Documentation](CI_CD_SETUP_GUIDE.md) • [Contributing](CONTRIBUTING.md)

</div>