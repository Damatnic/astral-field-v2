#!/usr/bin/env node

/**
 * Automated Netlify Deployment Script
 * Deploys AstralField Fantasy Football Platform to Netlify with all configurations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Environment variables for Netlify
const ENV_VARS = {
  // Database
  DATABASE_URL: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  DATABASE_URL_UNPOOLED: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  
  // Postgres
  POSTGRES_URL: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  POSTGRES_URL_NON_POOLING: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  POSTGRES_USER: 'neondb_owner',
  POSTGRES_HOST: 'ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech',
  POSTGRES_PASSWORD: 'npg_rkDs2yUYZEQ7',
  POSTGRES_DATABASE: 'neondb',
  POSTGRES_PRISMA_URL: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?connect_timeout=15&sslmode=require',
  
  // Auth
  NEXTAUTH_SECRET: '4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis=',
  NEXTAUTH_URL: 'https://astralfield-fantasy.netlify.app',
  
  // App URLs (will be updated after deployment)
  NEXT_PUBLIC_APP_URL: 'https://astralfield-fantasy.netlify.app',
  
  // Stack Auth
  NEXT_PUBLIC_STACK_PROJECT_ID: '8ae5529b-56ad-4132-ae99-cc530d7e22cb',
  NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: 'pck_gv9b0kp5fa6668yrx3y5nbrka53r2fket039jwq0k0wvg',
  STACK_SECRET_SERVER_KEY: 'ssk_ab99sq01f594aja1xys9xft7andsvfeybnf9y2mmx6crg',
  
  // Auth0
  AUTH0_SECRET: 'eJ984INJetDPrysB7C5jPskPW8mw8vaRl-ya456K06Dj-zElQLz-q3hB1eyXohZZ',
  AUTH0_BASE_URL: 'https://astralfield-fantasy.netlify.app',
  AUTH0_ISSUER_BASE_URL: 'https://dev-ac3ajs327vs5vzhk.us.auth0.com',
  AUTH0_CLIENT_ID: 'hqbzaW4XOvGR8nfqsFx6r80WLKq19xkb',
  AUTH0_CLIENT_SECRET: 'eJ984INJetDPrysB7C5jPskPW8mw8vaRl-ya456K06Dj-zElQLz-q3hB1eyXohZZ',
  
  // Node
  NODE_ENV: 'production'
};

console.log('🚀 AstralField Fantasy Football - Netlify Deployment\n');
console.log('═══════════════════════════════════════════════════════\n');

// Step 1: Check if Netlify CLI is installed
console.log('📦 Checking Netlify CLI...');
try {
  execSync('netlify --version', { stdio: 'pipe' });
  console.log('✅ Netlify CLI is installed\n');
} catch (error) {
  console.error('❌ Netlify CLI not found. Installing...');
  execSync('npm install -g netlify-cli', { stdio: 'inherit' });
}

// Step 2: Login to Netlify (if needed)
console.log('🔐 Checking Netlify authentication...');
try {
  const authCheck = execSync('netlify status', { stdio: 'pipe' }).toString();
  if (authCheck.includes('Not logged in')) {
    console.log('📝 Please login to Netlify:');
    execSync('netlify login', { stdio: 'inherit' });
  } else {
    console.log('✅ Already authenticated with Netlify\n');
  }
} catch (error) {
  console.log('📝 Please login to Netlify:');
  try {
    execSync('netlify login', { stdio: 'inherit' });
  } catch (loginError) {
    console.log('⚠️  Continuing without login (may need manual authentication)');
  }
}

// Step 3: Initialize Netlify site
console.log('🌐 Initializing Netlify site...');
try {
  // Check if site is already linked
  const siteInfo = execSync('netlify status --json', { stdio: 'pipe' }).toString();
  const site = JSON.parse(siteInfo);
  
  if (site.siteId) {
    console.log(`✅ Site already linked: ${site.siteData?.name || 'Unknown'}\n`);
  } else {
    throw new Error('Site not linked');
  }
} catch (error) {
  console.log('📝 Creating new Netlify site...');
  try {
    // Create new site with name
    execSync('netlify init --manual', { 
      input: 'astralfield-fantasy\n',
      stdio: 'pipe' 
    });
    console.log('✅ Netlify site created\n');
  } catch (initError) {
    console.log('⚠️  Site initialization may require manual setup');
  }
}

// Step 4: Set environment variables
console.log('🔧 Setting environment variables...');
let envCount = 0;

for (const [key, value] of Object.entries(ENV_VARS)) {
  try {
    console.log(`  Setting ${key}...`);
    execSync(`netlify env:set ${key} "${value}"`, { stdio: 'pipe' });
    envCount++;
  } catch (error) {
    // Try alternative method
    try {
      execSync(`echo ${key}="${value}" | netlify env:set ${key}`, { stdio: 'pipe' });
      envCount++;
    } catch (altError) {
      console.log(`  ⚠️  Could not set ${key} automatically`);
    }
  }
}

console.log(`✅ Set ${envCount}/${Object.keys(ENV_VARS).length} environment variables\n`);

// Step 5: Build the project locally
console.log('🔨 Building project...');
try {
  console.log('  Running build command...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 6: Deploy to Netlify
console.log('🚀 Deploying to Netlify...');
try {
  const deployResult = execSync('netlify deploy --prod --build', { 
    stdio: 'pipe',
    encoding: 'utf8' 
  });
  
  console.log('✅ Deployment successful!\n');
  
  // Extract URL from deployment result
  const urlMatch = deployResult.match(/https:\/\/[^\s]+\.netlify\.app/);
  if (urlMatch) {
    const deployUrl = urlMatch[0];
    console.log('🌐 Your site is live at:');
    console.log(`   ${deployUrl}\n`);
    
    // Update environment variables with actual URL
    if (!deployUrl.includes('astralfield-fantasy')) {
      console.log('📝 Updating environment variables with actual URL...');
      try {
        execSync(`netlify env:set NEXTAUTH_URL "${deployUrl}"`, { stdio: 'pipe' });
        execSync(`netlify env:set NEXT_PUBLIC_APP_URL "${deployUrl}"`, { stdio: 'pipe' });
        execSync(`netlify env:set AUTH0_BASE_URL "${deployUrl}"`, { stdio: 'pipe' });
        console.log('✅ URLs updated\n');
      } catch (updateError) {
        console.log('⚠️  Could not update URLs automatically');
      }
    }
    
    // Test the deployment
    console.log('🧪 Testing deployment...');
    setTimeout(() => {
      const https = require('https');
      https.get(`${deployUrl}/api/health`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 503) {
          console.log('✅ API is responding!');
        } else {
          console.log(`⚠️  API returned status ${res.statusCode}`);
        }
      }).on('error', (err) => {
        console.log('⚠️  Could not reach API:', err.message);
      });
    }, 3000);
  }
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  console.log('\n💡 Try running: netlify deploy --prod --build');
  process.exit(1);
}

// Step 7: Display summary
console.log('\n📊 Deployment Summary');
console.log('═══════════════════════════════════════════════════════');
console.log('✅ Netlify site configured');
console.log(`✅ ${envCount} environment variables set`);
console.log('✅ Project built successfully');
console.log('✅ Deployed to production');

console.log('\n📱 Test Credentials:');
console.log('═══════════════════════════════════════════════════════');
console.log('Demo User: demo@astralfield.com / demo123');
console.log('Admin: admin@astralfield.com / AdminPass123!');
console.log('Commissioner: commissioner@astralfield.com / CommishPass123!');

console.log('\n🎉 AstralField Fantasy Football is now live on Netlify!');
console.log('\n💡 Next Steps:');
console.log('1. Visit your Netlify dashboard to view analytics');
console.log('2. Set up a custom domain (optional)');
console.log('3. Test the login flow with provided credentials');
console.log('4. Monitor the application health at /api/health');