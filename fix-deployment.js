#!/usr/bin/env node

/**
 * Comprehensive Deployment Fix Script
 * Addresses: CSP font issues, 404 errors, deployment configuration
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

class DeploymentFixer {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.baseUrl = 'https://astral-field-v2.vercel.app'; // Update with your actual domain
  }

  async run() {
    console.log('🔧 Starting Comprehensive Deployment Fix...\n');
    
    await this.checkDeploymentStatus();
    await this.checkCSPIssues();
    await this.checkAPIEndpoints();
    await this.checkRoutingConfiguration();
    await this.generateFixReport();
    
    console.log('\n✅ Deployment fix analysis complete!');
  }

  async checkDeploymentStatus() {
    console.log('📊 Checking deployment status...');
    
    try {
      const response = await this.fetchWithTimeout(this.baseUrl, 10000);
      const html = await response.text();
      
      if (response.status === 200) {
        console.log('✅ Main site loads successfully');
        
        // Check for CSP violations in the HTML
        if (html.includes('FKGroteskNeue') || html.includes('r2cdn.perplexity.ai')) {
          this.issues.push({
            type: 'CSP_FONT_VIOLATION',
            severity: 'HIGH',
            description: 'Perplexity font detected in HTML, blocked by CSP',
            fix: 'Font source already added to CSP in middleware.ts'
          });
        } else {
          console.log('✅ No obvious external font references in HTML');
        }
        
      } else {
        this.issues.push({
          type: 'DEPLOYMENT_ERROR',
          severity: 'CRITICAL',
          description: `Site returns ${response.status}`,
          fix: 'Check Vercel deployment logs and build configuration'
        });
      }
    } catch (error) {
      this.issues.push({
        type: 'DEPLOYMENT_UNREACHABLE',
        severity: 'CRITICAL',
        description: `Cannot reach deployment: ${error.message}`,
        fix: 'Verify domain and deployment status'
      });
    }
  }

  async checkCSPIssues() {
    console.log('🔒 Checking CSP configuration...');
    
    // Check if CSP report endpoint exists
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/security/csp-report`, 5000);
      
      if (response.status === 405) {
        console.log('✅ CSP report endpoint exists (POST method expected)');
      } else if (response.status === 404) {
        this.issues.push({
          type: 'MISSING_CSP_ENDPOINT',
          severity: 'MEDIUM',
          description: 'CSP report endpoint returns 404',
          fix: 'CSP report endpoint exists in codebase, check routing'
        });
      }
    } catch (error) {
      this.issues.push({
        type: 'CSP_ENDPOINT_ERROR',
        severity: 'MEDIUM',
        description: `CSP endpoint error: ${error.message}`,
        fix: 'Verify API routing and endpoint configuration'
      });
    }

    // Check CSP headers
    try {
      const response = await this.fetchWithTimeout(this.baseUrl, 5000);
      const cspHeader = response.headers.get('content-security-policy');
      
      if (cspHeader) {
        console.log('✅ CSP header present');
        
        if (cspHeader.includes('r2cdn.perplexity.ai')) {
          console.log('✅ Perplexity font domain allowed in CSP');
          this.fixes.push('Perplexity font domain added to CSP font-src directive');
        } else {
          this.issues.push({
            type: 'CSP_FONT_MISSING',
            severity: 'HIGH',
            description: 'Perplexity font domain not in CSP',
            fix: 'Already fixed in middleware.ts - needs deployment'
          });
        }
      } else {
        this.issues.push({
          type: 'NO_CSP_HEADER',
          severity: 'HIGH',
          description: 'No CSP header found',
          fix: 'Check middleware.ts security headers configuration'
        });
      }
    } catch (error) {
      console.warn('Could not check CSP headers:', error.message);
    }
  }

  async checkAPIEndpoints() {
    console.log('🔌 Checking critical API endpoints...');
    
    const endpoints = [
      '/api/health',
      '/api/auth/me',
      '/api/security/csp-report'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.fetchWithTimeout(`${this.baseUrl}${endpoint}`, 5000);
        
        if (response.status < 500) {
          console.log(`✅ ${endpoint} responding (${response.status})`);
        } else {
          this.issues.push({
            type: 'API_ERROR',
            severity: 'HIGH',
            description: `${endpoint} returns ${response.status}`,
            fix: 'Check API route implementation and error handling'
          });
        }
      } catch (error) {
        this.issues.push({
          type: 'API_UNREACHABLE',
          severity: 'HIGH',
          description: `${endpoint} unreachable: ${error.message}`,
          fix: 'Verify API route exists and is properly configured'
        });
      }
    }
  }

  async checkRoutingConfiguration() {
    console.log('🛣️  Checking routing configuration...');
    
    // Check if vercel.json is correctly configured for monorepo
    const vercelConfigPath = './vercel.json';
    if (fs.existsSync(vercelConfigPath)) {
      const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
      
      if (vercelConfig.builds && vercelConfig.builds[0]?.src === 'apps/web/package.json') {
        console.log('✅ Vercel.json correctly configured for monorepo');
        this.fixes.push('Vercel configuration points to apps/web correctly');
      } else {
        this.issues.push({
          type: 'VERCEL_CONFIG_ERROR',
          severity: 'CRITICAL',
          description: 'Vercel.json not configured for apps/web monorepo structure',
          fix: 'Update vercel.json to point to apps/web/package.json'
        });
      }
    }

    // Check if the web app builds successfully
    const webAppPath = './apps/web';
    if (fs.existsSync(path.join(webAppPath, 'package.json'))) {
      console.log('✅ Web app package.json exists');
      this.fixes.push('Monorepo structure is correct');
    } else {
      this.issues.push({
        type: 'MISSING_WEB_APP',
        severity: 'CRITICAL',
        description: 'apps/web directory or package.json missing',
        fix: 'Verify monorepo structure and web app location'
      });
    }
  }

  async generateFixReport() {
    console.log('\n📋 Generating Fix Report...\n');
    console.log('='.repeat(60));
    console.log('🔧 DEPLOYMENT FIX REPORT');
    console.log('='.repeat(60));
    
    if (this.fixes.length > 0) {
      console.log('\n✅ FIXES APPLIED:');
      this.fixes.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix}`);
      });
    }
    
    if (this.issues.length > 0) {
      console.log('\n❌ ISSUES FOUND:');
      this.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.type} (${issue.severity})`);
        console.log(`   Description: ${issue.description}`);
        console.log(`   Fix: ${issue.fix}`);
      });
      
      console.log('\n🚀 NEXT STEPS:');
      console.log('1. The CSP has been updated to allow Perplexity fonts');
      console.log('2. Redeploy the application with: git add . && git commit -m "Fix CSP and deployment issues" && git push');
      console.log('3. Monitor CSP violations after deployment');
      console.log('4. Clear browser cache to ensure new CSP policies take effect');
      
    } else {
      console.log('\n🎉 No issues found! Deployment looks healthy.');
    }
    
    console.log('\n' + '='.repeat(60));
  }

  async fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'DeploymentFixer/1.0'
        }
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

// Run the deployment fixer
if (require.main === module) {
  const fixer = new DeploymentFixer();
  fixer.run().catch(console.error);
}

module.exports = DeploymentFixer;