#!/bin/bash

# Add environment variables to Vercel one by one
echo "Adding environment variables to Vercel..."

# System vars
echo "production" | vercel env add NODE_ENV production
echo "1" | vercel env add NEXT_TELEMETRY_DISABLED production

# Database
echo "postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" | vercel env add DATABASE_URL production

# Auth0
echo "eJ984INJetDPrysB7C5jPskPW8mw8vaRl-ya456K06Dj-zElQLz-q3hB1eyXohZZ" | vercel env add AUTH0_SECRET production
echo "https://dev-ac3ajs327vs5vzhk.us.auth0.com" | vercel env add AUTH0_ISSUER_BASE_URL production
echo "hqbzaW4XOvGR8nfqsFx6r80WLKq19xkb" | vercel env add AUTH0_CLIENT_ID production
echo "eJ984INJetDPrysB7C5jPskPW8mw8vaRl-ya456K06Dj-zElQLz-q3hB1eyXohZZ" | vercel env add AUTH0_CLIENT_SECRET production

# NextAuth
echo "KP9SglHlLADxibEBjponfYzSH0VR1W8bxnFb8dLPVBU=" | vercel env add NEXTAUTH_SECRET production

echo "Environment variables added!"