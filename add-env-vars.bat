@echo off
echo postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require | npx vercel env add DATABASE_URL production
echo postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require | npx vercel env add DIRECT_DATABASE_URL production
echo abc123def456ghi789jklmnopqrstuvwxyz | npx vercel env add NEXTAUTH_SECRET production
echo https://astralfield-v2-astral-productions.vercel.app | npx vercel env add NEXTAUTH_URL production
echo https://astralfield-v2-astral-productions.vercel.app | npx vercel env add NEXT_PUBLIC_APP_URL production
echo production | npx vercel env add NODE_ENV production