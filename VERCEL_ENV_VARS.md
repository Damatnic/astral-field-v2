# Vercel Environment Variables Configuration

## Required Environment Variables for Production

Add the following environment variables to your Vercel project settings:

### Database Configuration (Neon)
```
DATABASE_URL=postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_WEBSOCKETS=postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&connection_limit=30&pool_timeout=30
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Neon Auth Integration (STACK)
```
NEON_CLIENT_ID=7g52ka1xujumiu4k7qtmpldudnkqgvix
NEON_CLIENT_SECRET=d48pyk5y7dh8smyawo57fbwothi8jhoa9fnvahd6vgkx5dwwrby0e13fvkdnfbm3
NEON_APP_URL=https://console.neon.tech/app
```

### Auth0 Configuration (Legacy - for backward compatibility)
```
AUTH0_CLIENT_ID=Z4mSxRpYTb1dvnbWymEQWjDPF2vobbnz
AUTH0_CLIENT_SECRET=eH0TPMXK3DIi2b1GpfidPZDGmmrtc89onr4irEMTHUF-Q2GyPw3B8Us-iH9mXvgZ
AUTH0_DOMAIN=dev-ac3ajs327vs5vzhk.us.auth0.com
AUTH0_BASE_URL=https://astralfield.vercel.app
AUTH0_SECRET=4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis=
```

### NextAuth Configuration
```
NEXTAUTH_URL=https://astralfield.vercel.app
NEXTAUTH_SECRET=4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis=
NEXT_PUBLIC_APP_URL=https://astralfield.vercel.app
```

### ESPN API Configuration
```
ESPN_BASE_URL=https://site.api.espn.com/apis/site/v2/sports/football/nfl
ESPN_FANTASY_URL=https://fantasy.espn.com/apis/v3/games/ffl
```

### Feature Flags
```
ENABLE_LIVE_SCORING=true
ENABLE_NEWS_FEED=true
ENABLE_PLAYER_SYNC=true
```

### Data Refresh Intervals (milliseconds)
```
SCORE_REFRESH_INTERVAL=30000
NEWS_REFRESH_INTERVAL=300000
PLAYER_REFRESH_INTERVAL=86400000
```

## How to Add These to Vercel

1. Go to your Vercel Dashboard
2. Select your project (astralfield-v2)
3. Navigate to Settings > Environment Variables
4. Add each variable listed above
5. Make sure to select "Production" environment
6. Save the changes
7. Redeploy your application for changes to take effect

## Test Users

The database has been seeded with the D'Amato Dynasty League users:

- Email format: `[firstname]@damato-dynasty.com`
- Password: `Dynasty2025!`
- Commissioner: Nicholas D'Amato (`nicholas@damato-dynasty.com`)

League Members:
1. Nicholas D'Amato - D'Amato Dynasty
2. Nick Hartley - Hartley's Heroes
3. Jack McCaigue - McCaigue Mayhem
4. Larry McCaigue - Larry Legends
5. Renee McCaigue - Renee's Reign
6. Jon Kornbeck - Kornbeck Crushers
7. David Jarvey - Jarvey's Juggernauts
8. Kaity Lorbecki - Lorbecki Lions
9. Cason Minor - Minor Miracles
10. Brittany Bergum - Bergum Blitz

## Notes

- All database URLs use the Neon connection pooler for optimal performance
- The DIRECT_URL is used for database migrations
- Users should change their passwords on first login
- The Auth0 configuration is kept for legacy compatibility but can be removed if not needed