#!/usr/bin/env node

/**
 * Vercel Deployment Script for AstralField
 * This script handles the deployment to Vercel with proper configuration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Vercel Deployment Process...');

// Check for required environment variables
function checkEnvironment() {
  console.log('📋 Checking deployment requirements...');
  
  // Check if Vercel CLI is installed
  try {
    execSync('vercel --version', { stdio: 'pipe' });
    console.log('✅ Vercel CLI is installed');
  } catch (error) {
    console.error('❌ Vercel CLI is not installed. Run: npm install -g vercel');
    process.exit(1);
  }
  
  // Check for .vercel directory (project linked)
  const vercelDir = path.join(process.cwd(), '.vercel');
  if (!fs.existsSync(vercelDir)) {
    console.log('⚠️  Project not linked to Vercel. Will prompt for setup during deployment.');
  } else {
    console.log('✅ Project is linked to Vercel');
  }
}

// Clean build artifacts
function cleanBuild() {
  console.log('🧹 Cleaning previous build artifacts...');
  
  const dirs = ['.next', 'dist', '.vercel/output'];
  dirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`  Removed ${dir}`);
      } catch (error) {
        console.warn(`  Could not remove ${dir}:`, error.message);
      }
    }
  });
  
  console.log('✅ Clean complete');
}

// Build the project
function buildProject() {
  console.log('🏗️  Building project...');
  
  try {
    // First generate Prisma client
    console.log('  Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Build Next.js
    console.log('  Building Next.js application...');
    execSync('npm run build', { stdio: 'inherit' });
    
    console.log('✅ Build successful');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Deploy to Vercel
function deployToVercel(isProduction = false) {
  console.log(`🌐 Deploying to Vercel (${isProduction ? 'Production' : 'Preview'})...`);
  
  try {
    const command = isProduction 
      ? 'vercel --prod' 
      : 'vercel';
    
    console.log(`  Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
    
    console.log(`✅ Deployment complete!`);
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Get deployment URL
function getDeploymentInfo() {
  console.log('📊 Getting deployment information...');
  
  try {
    const output = execSync('vercel ls --limit 1', { encoding: 'utf8' });
    console.log(output);
  } catch (error) {
    console.warn('Could not fetch deployment info:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const isProduction = args.includes('--prod') || args.includes('--production');
  const skipBuild = args.includes('--skip-build');
  const skipClean = args.includes('--skip-clean');
  
  console.log('🎯 Deployment Configuration:');
  console.log(`  Environment: ${isProduction ? 'Production' : 'Preview'}`);
  console.log(`  Skip Build: ${skipBuild}`);
  console.log(`  Skip Clean: ${skipClean}`);
  console.log('');
  
  // Run deployment steps
  checkEnvironment();
  
  if (!skipClean) {
    cleanBuild();
  }
  
  if (!skipBuild) {
    buildProject();
  }
  
  deployToVercel(isProduction);
  getDeploymentInfo();
  
  console.log('\n🎉 Deployment script completed successfully!');
  console.log('📝 Next steps:');
  console.log('  1. Check the deployment URL provided above');
  console.log('  2. Verify all pages load correctly');
  console.log('  3. Test API endpoints');
  console.log('  4. Monitor logs: vercel logs --follow');
}

// Execute
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});