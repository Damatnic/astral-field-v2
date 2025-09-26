#!/usr/bin/env node
/**
 * Zenith Production Validation
 * Quick validation of D'Amato Dynasty League production deployment
 */

const https = require('https');
const url = 'https://web-daxgcan59-astral-productions.vercel.app';

console.log('🔬 Zenith Production Validation');
console.log('Testing D\'Amato Dynasty League Production...');
console.log('='.repeat(55));

function validateAsset(assetPath) {
  return new Promise((resolve, reject) => {
    https.get(url + assetPath, (res) => {
      resolve({
        path: assetPath,
        status: res.statusCode,
        contentType: res.headers['content-type'],
        size: res.headers['content-length']
      });
    }).on('error', reject);
  });
}

async function runValidation() {
  console.log('\n📡 Testing Homepage...');
  
  // Test homepage
  const homepageResult = await new Promise((resolve) => {
    https.get(url, (res) => {
      console.log(`✅ Homepage Status: ${res.statusCode} ${res.statusMessage}`);
      console.log(`📊 Content-Type: ${res.headers['content-type']}`);
      
      console.log('\n🔒 Security Headers:');
      console.log(`  - CSP: ${res.headers['content-security-policy'] ? '✅ Present' : '❌ Missing'}`);
      console.log(`  - X-Frame-Options: ${res.headers['x-frame-options'] || '❌ Not set'}`);
      console.log(`  - X-Content-Type-Options: ${res.headers['x-content-type-options'] || '❌ Not set'}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const hasTitle = data.includes('<title>');
        const hasError = data.includes('404') || data.includes('Error');
        const hasReact = data.includes('__NEXT_DATA__');
        
        console.log('\n📄 Page Content:');
        console.log(`  - Has Title: ${hasTitle ? '✅ Yes' : '❌ No'}`);
        console.log(`  - Has Errors: ${hasError ? '❌ Yes' : '✅ No'}`);
        console.log(`  - Next.js App: ${hasReact ? '✅ Yes' : '❌ No'}`);
        console.log(`  - Size: ${(data.length / 1024).toFixed(2)}KB`);
        
        resolve({
          status: res.statusCode,
          hasError,
          hasTitle,
          hasReact,
          securityHeaders: {
            csp: !!res.headers['content-security-policy'],
            xFrame: !!res.headers['x-frame-options'],
            xContent: !!res.headers['x-content-type-options']
          }
        });
      });
    });
  });
  
  console.log('\n⚡ Testing Critical Assets...');
  
  const criticalAssets = [
    '/_next/static/chunks/webpack.js',
    '/_next/static/chunks/main-app.js',
    '/_next/static/css/app/layout.css'
  ];
  
  let assetResults = [];
  for (const asset of criticalAssets) {
    try {
      const result = await validateAsset(asset);
      console.log(`${result.status === 200 ? '✅' : '❌'} ${asset}: ${result.status} (${result.contentType})`);
      assetResults.push(result);
    } catch (error) {
      console.log(`❌ ${asset}: Failed to load`);
      assetResults.push({ path: asset, status: 404, error: true });
    }
  }
  
  console.log('\n🏈 Testing D\'Amato Dynasty League Features...');
  
  // Test auth endpoints
  const authEndpoints = ['/api/auth/signin', '/api/auth/session'];
  for (const endpoint of authEndpoints) {
    try {
      const result = await validateAsset(endpoint);
      console.log(`${result.status < 500 ? '✅' : '❌'} ${endpoint}: ${result.status}`);
    } catch (error) {
      console.log(`❌ ${endpoint}: Failed`);
    }
  }
  
  console.log('\n📊 Validation Summary:');
  console.log('='.repeat(30));
  
  const successfulAssets = assetResults.filter(r => r.status === 200).length;
  const totalAssets = assetResults.length;
  
  console.log(`🎯 Homepage: ${homepageResult.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🔒 Security: ${homepageResult.securityHeaders.xFrame ? '✅ PASS' : '⚠️  PARTIAL'}`);
  console.log(`⚡ Assets: ${successfulAssets}/${totalAssets} loaded successfully`);
  console.log(`📱 React App: ${homepageResult.hasReact ? '✅ PASS' : '❌ FAIL'}`);
  
  const overallPass = homepageResult.status === 200 && 
                     !homepageResult.hasError && 
                     homepageResult.hasReact &&
                     successfulAssets >= totalAssets * 0.8; // 80% assets must load
  
  console.log('\n' + '='.repeat(55));
  if (overallPass) {
    console.log('🎉 ✅ PRODUCTION VALIDATION PASSED');
    console.log('✅ D\'Amato Dynasty League is ready for comprehensive testing!');
    console.log('✅ All 10 users can proceed with E2E validation');
    console.log('✅ Production environment is stable');
  } else {
    console.log('🚫 ❌ PRODUCTION VALIDATION FAILED');
    console.log('❌ Fix critical issues before running full test suite');
  }
  console.log('='.repeat(55));
  
  return overallPass;
}

// Run validation
runValidation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });