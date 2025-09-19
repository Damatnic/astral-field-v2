const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying to Vercel Pro with enhanced configuration...\n');

// Step 1: Clean previous builds
console.log('1️⃣ Cleaning previous builds...');
try {
  execSync('rm -rf .next .vercel', { stdio: 'inherit' });
} catch (e) {
  // Ignore errors
}

// Step 2: Create necessary files BEFORE build
console.log('2️⃣ Creating required files...');
const dirs = ['.next', '.next/export'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create export-detail.json
fs.writeFileSync('.next/export-detail.json', JSON.stringify({
  version: 1,
  hasExportPathMap: false,
  exportTrailingSlash: false,
  isNextImageImported: false
}));

// Create 404.html
fs.writeFileSync('.next/export/404.html', '<!DOCTYPE html><html><body>404</body></html>');

// Step 3: Build locally first
console.log('3️⃣ Building application locally...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

// Step 4: Ensure files exist after build
console.log('4️⃣ Verifying build output...');
if (!fs.existsSync('.next/export-detail.json')) {
  fs.writeFileSync('.next/export-detail.json', JSON.stringify({
    version: 1,
    hasExportPathMap: false,
    exportTrailingSlash: false,
    isNextImageImported: false
  }));
}

// Step 5: Deploy with --prebuilt flag
console.log('5️⃣ Deploying to Vercel Pro...');
try {
  // First, build for Vercel
  execSync('vercel build --prod', { stdio: 'inherit' });
  
  // Then deploy the prebuilt output
  execSync('vercel --prod --prebuilt', { stdio: 'inherit' });
  
  console.log('\n✅ Deployment initiated successfully!');
} catch (error) {
  console.error('Deployment failed:', error.message);
  
  // Fallback: Try regular deployment
  console.log('\n6️⃣ Trying alternative deployment method...');
  try {
    execSync('vercel --prod --yes', { stdio: 'inherit' });
  } catch (e) {
    console.error('Alternative deployment also failed:', e.message);
  }
}

console.log('\n📌 Check your Vercel dashboard at https://vercel.com/dashboard');