# D'Amato Dynasty League - Production Setup Guide

## 🏈 Phase 2 Implementation Complete

The D'Amato Dynasty League fantasy football platform is now production-ready with real user accounts, NFL player data integration, and commissioner tools.

## 📋 What's Been Implemented

### 1. **Real League Setup** ✅
- Created the D'Amato Dynasty League with 10 real members
- Nicholas D'Amato set as Commissioner with admin privileges
- All 10 teams created with proper names and ownership

### 2. **Production Authentication** ✅
- Secure authentication system for all 10 members
- Temporary passwords for initial login (must be reset)
- JWT-based session management
- Commissioner role-based access control

### 3. **NFL Player Data Integration** ✅
- `NFLDataService` for real player data
- Supports SportsData.io API (when API key is provided)
- Fallback to ESPN free API and static top players
- Live scoring updates for current week

### 4. **Database Schema** ✅
- Complete fantasy football database structure
- Player stats, projections, and injury reports
- League settings, scoring system, and roster management
- Transaction history and audit logging

### 5. **Commissioner Tools** ✅
Nicholas D'Amato has access to:
- Comprehensive league dashboard
- Trade approval/veto powers
- Waiver processing controls
- Score updates and week advancement
- League settings management
- Announcement system
- Force lineup changes
- Complete audit trail

## 🔐 User Credentials

### Commissioner Account
- **Name**: Nicholas D'Amato
- **Email**: nicholas.damato@damatodynasty.com
- **Password**: Commissioner2024!
- **Team**: The Commissioners

### Team Owners
1. **Nick Hartley** - Hartley Heroes
   - Email: nick.hartley@damatodynasty.com
   - Password: HartleyHeroes2024!

2. **Jack McCaigue** - Jack's Juggernauts
   - Email: jack.mccaigue@damatodynasty.com
   - Password: Juggernauts2024!

3. **Larry McCaigue** - Larry's Legends
   - Email: larry.mccaigue@damatodynasty.com
   - Password: Legends2024!

4. **Renee McCaigue** - Renee's Renegades
   - Email: renee.mccaigue@damatodynasty.com
   - Password: Renegades2024!

5. **Jon Kornbeck** - Kornbeck Crushers
   - Email: jon.kornbeck@damatodynasty.com
   - Password: Crushers2024!

6. **David Jarvey** - Jarvey's Giants
   - Email: david.jarvey@damatodynasty.com
   - Password: Giants2024!

7. **Kaity Lorbecki** - Lorbecki Lightning
   - Email: kaity.lorbecki@damatodynasty.com
   - Password: Lightning2024!

8. **Cason Minor** - Minor Miracles
   - Email: cason.minor@damatodynasty.com
   - Password: Miracles2024!

9. **Brittany Bergum** - Bergum Blitz
   - Email: brittany.bergum@damatodynasty.com
   - Password: Blitz2024!

## 🚀 Setup Instructions

### 1. Database Setup
```bash
# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 2. Initialize Production League
```bash
# Run the production setup script
npm run setup:production

# Or manually:
npx ts-node scripts/setup-production-league.ts
```

### 3. Environment Variables
Create a `.env` file with:
```env
# Database
DATABASE_URL="your-postgres-connection-string"
DATABASE_URL_UNPOOLED="your-postgres-direct-url"

# Authentication
JWT_SECRET="your-secure-jwt-secret"

# NFL Data (optional but recommended)
SPORTSDATA_API_KEY="your-sportsdata-api-key"

# Email Service (for notifications)
SENDGRID_API_KEY="your-sendgrid-key"
# or
AWS_SES_ACCESS_KEY="your-aws-key"
AWS_SES_SECRET_KEY="your-aws-secret"
```

### 4. Start the Application
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/production-login` - User login
- `GET /api/auth/production-login` - Check auth status

### League Data
- `GET /api/league/damato` - Get full league data
- `GET /api/league/damato/standings` - Get current standings

### Commissioner Tools (Nicholas D'Amato only)
- `GET /api/commissioner` - Commissioner dashboard
- `PUT /api/commissioner` - Update league settings
- `POST /api/commissioner` - Execute commissioner actions
  - APPROVE_TRADE
  - VETO_TRADE
  - PROCESS_WAIVERS
  - UPDATE_SCORES
  - ADVANCE_WEEK
  - RESET_WAIVER_ORDER
  - FORCE_LINEUP_CHANGE
  - SEND_ANNOUNCEMENT

### NFL Data
- Automatically fetches player data on startup
- Updates scores weekly
- Real-time injury reports when API key is configured

## 🎮 League Settings

### Scoring System (PPR)
- **Passing**: 1 point per 25 yards, 4 points per TD, -2 per INT
- **Rushing**: 1 point per 10 yards, 6 points per TD
- **Receiving**: 1 point per 10 yards, 6 points per TD, 0.5 per reception
- **Kicking**: 3-5 points per FG (distance-based), 1 per XP
- **Defense**: Points based on scoring, turnovers, and sacks

### Roster Configuration
- 1 QB
- 2 RB
- 2 WR
- 1 TE
- 1 FLEX
- 1 K
- 1 DST
- 6 BENCH
- 2 IR

### Waiver System
- FAAB (Free Agent Acquisition Budget)
- $100 budget per team
- Processed weekly by commissioner

### Playoffs
- Weeks 15-17
- Top 6 teams qualify
- Commissioner sets matchups

## ⚡ Performance Optimizations

1. **Database Indexes**: All frequently queried fields are indexed
2. **Caching**: Player data cached for quick access
3. **Lazy Loading**: Rosters and stats loaded on demand
4. **Batch Operations**: Bulk updates for scoring

## 🔒 Security Features

1. **Password Security**: Bcrypt hashing with salt rounds
2. **JWT Authentication**: Secure token-based auth
3. **Role-Based Access**: Commissioner vs Player permissions
4. **Audit Logging**: All commissioner actions logged
5. **Session Management**: Automatic expiry and refresh

## 📱 Mobile Support

The platform is fully responsive and works on:
- iOS Safari
- Android Chrome
- Tablet browsers
- PWA installation supported

## 🐛 Troubleshooting

### Common Issues

1. **"League not found" error**
   - Run: `npm run setup:production`

2. **No players showing**
   - Check SPORTSDATA_API_KEY in .env
   - System will use fallback data if not set

3. **Can't log in**
   - Verify email/password exactly as shown
   - Check database connection

4. **Commissioner tools not visible**
   - Must be logged in as nicholas.damato@damatodynasty.com

## 📧 Support & Maintenance

### Weekly Tasks (Commissioner)
1. Process waivers (Tuesday night)
2. Update scores (after games)
3. Handle trade approvals
4. Send weekly recap

### System Maintenance
1. Database backups (automated recommended)
2. Update NFL player data weekly
3. Clear old session data monthly
4. Review audit logs for issues

## 🎯 Next Steps

1. **Email Service**: Set up SendGrid or AWS SES for notifications
2. **Live Data**: Add SPORTSDATA_API_KEY for real-time updates
3. **Redis Cache**: Implement for improved performance
4. **WebSockets**: Enable for live draft and real-time scoring
5. **Mobile Apps**: Consider native iOS/Android apps

## 🏆 League Rules & Etiquette

1. **Trade Deadline**: November 30, 2024
2. **Playoffs**: Weeks 15-17 (top 6 teams)
3. **Dues**: Managed outside the platform
4. **Veto Policy**: Commissioner discretion
5. **Inactive Teams**: Commissioner may set lineups

---

**Platform Status**: ✅ PRODUCTION READY

**Support Contact**: Commissioner Nicholas D'Amato

**Version**: 2.0.0 - D'Amato Dynasty Edition

*May the best team win! 🏈*