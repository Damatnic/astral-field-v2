#!/usr/bin/env node

/**
 * Vercel Deployment Verification Script
 * Ensures the project is properly configured for Vercel deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Vercel Deployment Configuration Verification\n');
console.log('=' . repeat(50));

let errors = [];
let warnings = [];
let success = [];

// Check next.config.js
function checkNextConfig() {
  console.log('\n📋 Checking next.config.js...');
  const configPath = path.join(process.cwd(), 'next.config.js');
  
  if (!fs.existsSync(configPath)) {
    errors.push('❌ next.config.js not found');
    return;
  }
  
  const config = fs.readFileSync(configPath, 'utf-8');
  
  // Check for problematic configurations
  if (config.includes("output: 'standalone'") && !config.includes("// output: 'standalone'")) {
    errors.push("❌ Remove 'output: standalone' from next.config.js - Vercel handles this automatically");
  }
  
  if (config.includes("output: 'export'") && !config.includes("// output: 'export'")) {
    errors.push("❌ Remove 'output: export' from next.config.js - Not compatible with API routes");
  }
  
  if (!config.includes('eslint:')) {
    warnings.push("⚠️  Consider adding 'eslint: { ignoreDuringBuilds: true }' to avoid build failures");
  }
  
  if (!config.includes('typescript:')) {
    warnings.push("⚠️  Consider adding 'typescript: { ignoreBuildErrors: true }' to avoid build failures");
  }
  
  success.push('✅ next.config.js exists');
}

// Check vercel.json
function checkVercelJson() {
  console.log('\n📋 Checking vercel.json...');
  const vercelPath = path.join(process.cwd(), 'vercel.json');
  
  if (!fs.existsSync(vercelPath)) {
    warnings.push('⚠️  vercel.json not found - Using default configuration');
    return;
  }
  
  try {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));
    
    if (vercelConfig.framework !== 'nextjs') {
      warnings.push('⚠️  Consider setting framework to "nextjs" in vercel.json');
    }
    
    if (vercelConfig.buildCommand && !vercelConfig.buildCommand.includes('prisma generate')) {
      warnings.push('⚠️  Ensure Prisma client is generated in build command');
    }
    
    success.push('✅ vercel.json is valid JSON');
  } catch (e) {
    errors.push('❌ vercel.json contains invalid JSON');
  }
}

// Check package.json scripts
function checkPackageJson() {
  console.log('\n📋 Checking package.json...');
  const packagePath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    errors.push('❌ package.json not found');
    return;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    
    if (!packageJson.scripts.build) {
      errors.push('❌ Missing build script in package.json');
    } else {
      const buildScript = packageJson.scripts.build;
      
      // Check for problematic build scripts
      if (buildScript.includes('export-detail.json')) {
        errors.push('❌ Remove manual export-detail.json creation from build script');
      }
      
      if (!buildScript.includes('prisma generate')) {
        warnings.push('⚠️  Consider adding "prisma generate" to build script');
      }
      
      success.push('✅ Build script found in package.json');
    }
    
    // Check for postinstall script
    if (packageJson.scripts.postinstall && packageJson.scripts.postinstall.includes('prisma generate')) {
      success.push('✅ Prisma generation in postinstall script');
    }
    
  } catch (e) {
    errors.push('❌ package.json contains invalid JSON');
  }
}

// Check middleware
function checkMiddleware() {
  console.log('\n📋 Checking middleware configuration...');
  
  const middlewarePaths = [
    'middleware.ts',
    'middleware.js',
    'src/middleware.ts',
    'src/middleware.js'
  ];
  
  let middlewareFound = false;
  for (const middlewarePath of middlewarePaths) {
    const fullPath = path.join(process.cwd(), middlewarePath);
    if (fs.existsSync(fullPath)) {
      middlewareFound = true;
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      if (!content.includes('export const config')) {
        warnings.push('⚠️  Middleware should export a config with matcher patterns');
      }
      
      if (content.includes('edge') && content.includes('runtime')) {
        warnings.push('⚠️  Edge Runtime in middleware can cause deployment issues');
      }
      
      success.push(`✅ Middleware found at ${middlewarePath}`);
      break;
    }
  }
  
  if (!middlewareFound) {
    success.push('✅ No middleware file (not required)');
  }
}

// Check environment files
function checkEnvironment() {
  console.log('\n📋 Checking environment configuration...');
  
  const envFiles = ['.env.local', '.env.production'];
  let envFound = false;
  
  for (const envFile of envFiles) {
    if (fs.existsSync(path.join(process.cwd(), envFile))) {
      envFound = true;
      warnings.push(`⚠️  ${envFile} found - Make sure environment variables are set in Vercel Dashboard`);
    }
  }
  
  if (!envFound) {
    success.push('✅ No local environment files (good for production)');
  }
}

// Check for problematic files
function checkProblematicFiles() {
  console.log('\n📋 Checking for problematic files...');
  
  const problematicFiles = [
    'prebuild.js',
    'scripts/vercel-build.js',
    '.next/export-detail.json'
  ];
  
  for (const file of problematicFiles) {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      errors.push(`❌ Remove ${file} - It can cause deployment issues`);
    }
  }
  
  success.push('✅ No known problematic files found');
}

// Check Prisma
function checkPrisma() {
  console.log('\n📋 Checking Prisma configuration...');
  
  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    errors.push('❌ prisma/schema.prisma not found');
    return;
  }
  
  success.push('✅ Prisma schema found');
  
  // Check if .env has DATABASE_URL
  if (fs.existsSync('.env')) {
    const env = fs.readFileSync('.env', 'utf-8');
    if (!env.includes('DATABASE_URL')) {
      warnings.push('⚠️  DATABASE_URL not found in .env - Ensure it\'s set in Vercel');
    }
  }
}

// Run all checks
function runChecks() {
  checkNextConfig();
  checkVercelJson();
  checkPackageJson();
  checkMiddleware();
  checkEnvironment();
  checkProblematicFiles();
  checkPrisma();
  
  // Print results
  console.log('\n' + '=' . repeat(50));
  console.log('\n📊 VERIFICATION RESULTS\n');
  
  if (success.length > 0) {
    console.log('✅ SUCCESSFUL CHECKS:');
    success.forEach(s => console.log('  ' + s));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(w => console.log('  ' + w));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS (Must Fix):');
    errors.forEach(e => console.log('  ' + e));
  }
  
  console.log('\n' + '=' . repeat(50));
  
  if (errors.length === 0) {
    console.log('\n🎉 Your project is ready for Vercel deployment!');
    console.log('\nNext steps:');
    console.log('1. Commit your changes: git add -A && git commit -m "Fix Vercel deployment"');
    console.log('2. Push to repository: git push');
    console.log('3. Deploy to Vercel: vercel --prod');
    console.log('\nOr if auto-deploy is enabled, just push to your repository.');
  } else {
    console.log('\n❌ Please fix the errors above before deploying.');
    process.exit(1);
  }
}

// Run the verification
runChecks();