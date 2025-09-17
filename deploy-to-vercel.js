#!/usr/bin/env node

/**
 * 🚀 ASTRAL FIELD V1 - AUTOMATED VERCEL DEPLOYMENT SCRIPT
 * 
 * This script will:
 * 1. Deploy the project to Vercel
 * 2. Set up environment variables
 * 3. Configure the production domain
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Astral Field V1 Deployment to Vercel...\n');

// Environment variables to set
const envVars = {
  'NODE_ENV': 'production',
  'NEXT_PUBLIC_APP_URL': 'https://astral-field-v1.vercel.app',
  'NEXTAUTH_URL': 'https://astral-field-v1.vercel.app',
  'NEXTAUTH_SECRET': '4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis=',
  'JWT_SECRET': '23be335444f5e8cc590f5e3019883f18fe7a4146e53372737dbd75517fd44f37101a28b9cb656ecd06de2a159601b8c34819ed915ec3a2f1b12835c373beba16',
  'ENCRYPTION_KEY': '68928ee6d5f81941d3c3440ce6ca72362a367016cacdcd85981651b2ee7cf12f',
  'SESSION_SECRET': '9357aa8b1361760aba1080f3ed4800a2e26abe0ad7bf638054b293cc5bfbd6ef',
  'API_SECRET_KEY': '6342e12a151ba7cc54bbf373bc1a738727744bfe20d57662e648c8b23ef6587e',
  'WEBHOOK_SECRET': '71f4eba86627dab8e4e5ec5f682dbf2b6cb9c0f398f3b84b15db37cc79738ff0',
  'REDIS_PASSWORD': '7bf5ab01cadf93b1aa978fb9121eb335',
  'CORS_ORIGIN': 'https://astral-field-v1.vercel.app',
  'EMAIL_FROM': 'noreply@astral-field-v1.vercel.app',
  'EMAIL_REPLY_TO': 'support@astral-field-v1.vercel.app',
  'VAPID_SUBJECT': 'mailto:admin@astral-field-v1.vercel.app'
};

function runCommand(command, description) {
  console.log(`📦 ${description}...`);
  try {
    const output = execSync(command, { 
      stdio: 'pipe',
      encoding: 'utf-8',
      cwd: __dirname 
    });
    console.log(`✅ ${description} completed`);
    return output;
  } catch (error) {
    console.log(`⚠️  ${description} - ${error.message}`);
    return null;
  }
}

function setEnvironmentVariable(key, value) {
  try {
    execSync(`vercel env add ${key} production`, {
      input: `${value}\n`,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
      cwd: __dirname
    });
    console.log(`✅ Set ${key}`);
  } catch (error) {
    console.log(`⚠️  Could not set ${key} - may already exist or need manual setup`);
  }
}

async function deploy() {
  console.log('🔐 Step 1: Checking authentication...');
  
  // Check if logged in
  const whoami = runCommand('vercel whoami', 'Checking Vercel authentication');
  if (!whoami) {
    console.log('🔑 Please login to Vercel...');
    runCommand('vercel login', 'Logging into Vercel');
  }

  console.log('\n🚀 Step 2: Deploying to Vercel...');
  
  // Deploy the project
  const deployOutput = runCommand('vercel --prod --confirm', 'Deploying to production');
  
  if (deployOutput) {
    console.log('\n✅ Deployment successful!');
    console.log('🌐 Your site is live at: https://astral-field-v1.vercel.app');
    
    console.log('\n🔧 Step 3: Setting up environment variables...');
    console.log('Note: Some variables may need to be set manually in Vercel dashboard');
    
    // Set core environment variables
    for (const [key, value] of Object.entries(envVars)) {
      setEnvironmentVariable(key, value);
    }
    
    console.log('\n🎉 Deployment Complete!');
    console.log('📋 Next Steps:');
    console.log('1. Visit: https://astral-field-v1.vercel.app');
    console.log('2. Set up database at: https://neon.tech');
    console.log('3. Add DATABASE_URL in Vercel dashboard');
    console.log('4. Configure external APIs (OpenAI, SportsData.io, etc.)');
    console.log('\n📖 See VERCEL_DEPLOYMENT_FIX.md for detailed setup guide');
    
  } else {
    console.log('\n❌ Deployment failed. Please check the error messages above.');
    console.log('💡 Try running: vercel --prod manually for more details');
  }
}

// Run deployment
deploy().catch(console.error);