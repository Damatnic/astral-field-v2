# 🏈 Test League 2025 Setup Guide

Complete 10-person fantasy football test league with Nicholas D'Amato as commissioner.

## 🚀 Quick Start

**One Command Setup:**
```bash
npm run quick-start
```

This will:
1. Reset the database
2. Create 10 test users with teams
3. Conduct a realistic draft
4. Set up Week 3 of 2025 season
5. Start the development server

## 📋 Manual Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database & League
```bash
npm run setup:test-league
```

### 3. Start the Application
```bash
npm run dev
```

### 4. Access the League
Go to: http://localhost:3007/login

## 👥 Test Users

All users have password: **fantasy2025**

| Name | Email | Role | Team Name |
|------|-------|------|-----------|
| **Nicholas D'Amato** | nicholas.damato@test.com | **Commissioner** | D'Amato Dynasty |
| Nick Hartley | nick.hartley@test.com | Team Owner | Hartley's Heroes |
| Jack McCaigue | jack.mccaigue@test.com | Team Owner | Jack Attack |
| Larry McCaigue | larry.mccaigue@test.com | Team Owner | Larry's Legends |
| Renee McCaigue | renee.mccaigue@test.com | Team Owner | Renee's Reign |
| Jon Kornbeck | jon.kornbeck@test.com | Team Owner | Kornbeck Crushers |
| David Jarvey | david.jarvey@test.com | Team Owner | Jarvey's Juggernauts |
| Kaity Lorbecki | kaity.lorbecki@test.com | Team Owner | Kaity's Knights |
| Cason Minor | cason.minor@test.com | Team Owner | Minor Threat |
| Brittany Bergum | brittany.bergum@test.com | Team Owner | Bergum's Best |

## 🏆 League Settings

- **Format:** 10-team PPR (Point Per Reception)
- **Season:** 2025 NFL Season
- **Current Week:** Week 3
- **Roster:** QB, RB, RB, WR, WR, TE, FLEX, K, DEF, 6 Bench, 1 IR
- **Scoring:** Standard PPR scoring
- **Playoffs:** 4 teams, Weeks 15-17
- **Trade Deadline:** Week 10

## 🎯 Draft Results

The draft was conducted with Nicholas D'Amato getting the 3rd pick (optimal position). All teams received competitive rosters through a fair snake draft algorithm. Nicholas's team is championship-caliber but not suspiciously overpowered.

### Draft Strategy Features:
- **Round 1-3:** Elite RBs and WRs prioritized
- **Round 4-6:** QB and TE positions filled strategically  
- **Round 7-13:** Depth and bench players
- **Round 14-16:** Kickers and Defenses

## 📊 Current Season Status

- **Weeks 1-2:** Completed with simulated results
- **Week 3:** Current week with active matchups
- **Team Records:** Updated based on Week 1-2 results
- **Standings:** Calculated with wins, losses, points for/against

## 🔄 Reset Commands

### Reset Test League
```bash
npm run reset:test-league
```

### Reset Database Only
```bash
npx prisma migrate reset --force
```

### Re-seed League Data
```bash
npx tsx scripts/seed-test-league.ts
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run quick-start` | Complete setup + start dev server |
| `npm run setup:test-league` | Setup database and create test league |
| `npm run reset:test-league` | Reset everything and recreate league |
| `npm run dev` | Start development server |
| `npm run test:espn` | Test ESPN API integration |

## 🏈 Features Included

### ✅ Complete League Setup
- 10 authentic team names and owners
- Realistic draft with strategic picks
- Week 1-2 historical results
- Week 3 current matchups

### ✅ Commissioner Features
- Nicholas D'Amato has admin privileges
- League settings management
- Trade approval powers
- User management capabilities

### ✅ Realistic Data
- Top 2025 NFL players by position
- Accurate ADP (Average Draft Position)
- PPR scoring system
- Standard roster requirements

### ✅ Authentication
- Quick login system for all users
- Session management
- Commissioner role detection
- Secure test environment

## 🎮 Testing Scenarios

### User Experience Testing
1. Login as different users
2. View rosters and lineups
3. Check standings and matchups
4. Test trade proposals
5. View player stats and news

### Commissioner Testing
1. Login as Nicholas D'Amato
2. Access commissioner tools
3. Manage league settings
4. Approve/reject trades
5. View all team rosters

### League Functionality
1. Week 3 scoring simulation
2. Waiver wire claims
3. Free agent pickups
4. Lineup optimization
5. Trade negotiations

## 📱 Mobile Testing

The platform is fully responsive and can be tested on:
- Desktop browsers
- Mobile devices
- Tablet interfaces
- Different screen sizes

## 🔒 Security Notes

- Test environment only
- No real user data
- Temporary authentication
- Local database only
- Safe for development testing

## 🚨 Important Notes

- This is a **test environment only**
- All data will be lost when database is reset
- Users and teams are fictional
- Designed for development and demonstration
- Not suitable for production use

---

**Need Help?**
- Check the logs for any errors
- Ensure all dependencies are installed
- Verify database connection
- Test ESPN API endpoints