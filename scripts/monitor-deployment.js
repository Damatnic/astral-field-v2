const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class DeploymentMonitor {
  constructor(deploymentUrl) {
    this.deploymentUrl = deploymentUrl;
    this.maxAttempts = 40;
    this.checkInterval = 15000; // 15 seconds
    this.healthCheckEndpoints = [
      '/api/health',
      '/api/monitoring/health',
      '/health'
    ];
  }

  async monitor() {
    console.log('🔍 Starting deployment monitoring...');
    console.log(`📊 Target URL: ${this.deploymentUrl}`);
    console.log(`⏱️ Max wait time: ${(this.maxAttempts * this.checkInterval) / 1000 / 60} minutes\n`);
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      console.log(`📊 Check ${attempt}/${this.maxAttempts} (${new Date().toLocaleTimeString()})`);
      
      try {
        const status = await this.checkDeploymentStatus();
        
        if (status.ready) {
          console.log('✅ Deployment successful!');
          await this.runComprehensiveChecks();
          return true;
        } else if (status.error) {
          console.log('❌ Deployment failed:', status.error);
          await this.handleDeploymentError(status.error);
          return false;
        }
        
        console.log(`⏳ Deployment in progress... (${status.state || 'unknown state'})`);
        await this.sleep(this.checkInterval);
        
      } catch (error) {
        console.error(`Error checking deployment (attempt ${attempt}):`, error.message);
        await this.sleep(this.checkInterval);
      }
    }
    
    console.log('⏱️ Deployment timeout - running diagnostics...');
    await this.runDiagnostics();
    return false;
  }

  async checkDeploymentStatus() {
    try {
      // First, try to get deployment info from Vercel CLI
      const deploymentId = this.extractDeploymentId(this.deploymentUrl);
      if (deploymentId) {
        try {
          const { stdout } = await execAsync(`vercel inspect ${deploymentId} --json`, { timeout: 10000 });
          const deployment = JSON.parse(stdout);
          
          return {
            ready: deployment.readyState === 'READY',
            error: deployment.errorCode || null,
            state: deployment.readyState
          };
        } catch (cliError) {
          console.log('⚠️ Vercel CLI check failed, trying HTTP check...');
        }
      }

      // Fallback to HTTP check
      const httpStatus = await this.checkHttpStatus(this.deploymentUrl);
      return {
        ready: httpStatus.status === 200,
        error: httpStatus.status >= 400 ? `HTTP ${httpStatus.status}` : null,
        state: httpStatus.status === 200 ? 'READY' : 'BUILDING'
      };
      
    } catch (error) {
      return { ready: false, error: error.message, state: 'ERROR' };
    }
  }

  extractDeploymentId(url) {
    // Extract deployment ID from Vercel URL
    const match = url.match(/https:\/\/[^-]+-[^-]+-([a-z0-9]+)-[^.]+\.vercel\.app/);
    return match ? match[1] : null;
  }

  async checkHttpStatus(url) {
    return new Promise((resolve) => {
      const client = url.startsWith('https') ? https : http;
      const timeoutMs = 10000;
      
      const request = client.get(url, { timeout: timeoutMs }, (res) => {
        resolve({ status: res.statusCode, headers: res.headers });
        res.destroy();
      });
      
      request.on('timeout', () => {
        request.destroy();
        resolve({ status: 0, error: 'timeout' });
      });
      
      request.on('error', (err) => {
        resolve({ status: 0, error: err.message });
      });
      
      request.setTimeout(timeoutMs);
    });
  }

  async runComprehensiveChecks() {
    console.log('\n🏥 Running comprehensive health checks...');
    
    const checks = [
      this.checkMainPage.bind(this),
      this.checkHealthEndpoints.bind(this),
      this.checkApiEndpoints.bind(this),
      this.checkAuthEndpoints.bind(this),
      this.runE2ETests.bind(this)
    ];
    
    const results = [];
    for (const check of checks) {
      try {
        const result = await check();
        results.push(result);
      } catch (error) {
        console.error(`Check failed: ${error.message}`);
        results.push({ passed: false, error: error.message });
      }
    }
    
    const passedChecks = results.filter(r => r.passed).length;
    const totalChecks = results.length;
    
    console.log(`\n📊 Health Check Summary: ${passedChecks}/${totalChecks} passed`);
    
    if (passedChecks === totalChecks) {
      console.log('🎉 All health checks passed! Deployment is fully operational.');
    } else if (passedChecks >= totalChecks * 0.8) {
      console.log('⚠️ Most checks passed. Minor issues detected but deployment is functional.');
    } else {
      console.log('❌ Multiple health checks failed. Deployment may have issues.');
      await this.suggestFixes(results);
    }
  }

  async checkMainPage() {
    console.log('🏠 Checking main page...');
    
    try {
      const response = await this.fetchWithTimeout(this.deploymentUrl);
      const html = await response.text();
      
      const checks = [
        { name: 'Status 200', passed: response.status === 200 },
        { name: 'Contains title', passed: html.includes('Fantasy Football') || html.includes('AstralField') },
        { name: 'React hydrated', passed: html.includes('__NEXT_DATA__') },
        { name: 'No error messages', passed: !html.includes('Application error') }
      ];
      
      checks.forEach(check => {
        console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}`);
      });
      
      return { passed: checks.every(c => c.passed), checks };
    } catch (error) {
      console.log(`  ❌ Main page check failed: ${error.message}`);
      return { passed: false, error: error.message };
    }
  }

  async checkHealthEndpoints() {
    console.log('🩺 Checking health endpoints...');
    
    const results = [];
    for (const endpoint of this.healthCheckEndpoints) {
      try {
        const url = `${this.deploymentUrl}${endpoint}`;
        const response = await this.fetchWithTimeout(url);
        
        if (response.status === 200) {
          const data = await response.json();
          const isHealthy = data.status === 'healthy' || data.status === 'ok';
          console.log(`  ✅ ${endpoint} - ${isHealthy ? 'Healthy' : 'Degraded'}`);
          results.push({ endpoint, passed: true, healthy: isHealthy });
        } else {
          console.log(`  ❌ ${endpoint} - HTTP ${response.status}`);
          results.push({ endpoint, passed: false, status: response.status });
        }
      } catch (error) {
        console.log(`  ❌ ${endpoint} - Failed: ${error.message}`);
        results.push({ endpoint, passed: false, error: error.message });
      }
    }
    
    return { passed: results.some(r => r.passed), results };
  }

  async checkApiEndpoints() {
    console.log('🔌 Checking API endpoints...');
    
    const endpoints = [
      { path: '/api/espn/scoreboard', name: 'ESPN Scoreboard' },
      { path: '/api/auth/providers', name: 'Auth Providers' },
      { path: '/api/espn/players?search=Aaron', name: 'Player Search' }
    ];
    
    const results = [];
    for (const { path, name } of endpoints) {
      try {
        const url = `${this.deploymentUrl}${path}`;
        const response = await this.fetchWithTimeout(url, 15000);
        
        const passed = response.status === 200;
        console.log(`  ${passed ? '✅' : '❌'} ${name} - ${response.status}`);
        
        if (passed && path.includes('espn')) {
          // Additional validation for ESPN endpoints
          const data = await response.json();
          const hasData = data.success || data.data || data.length > 0;
          if (!hasData) {
            console.log(`    ⚠️ ${name} returned empty data`);
          }
        }
        
        results.push({ endpoint: path, name, passed, status: response.status });
      } catch (error) {
        console.log(`  ❌ ${name} - Failed: ${error.message}`);
        results.push({ endpoint: path, name, passed: false, error: error.message });
      }
    }
    
    return { passed: results.filter(r => r.passed).length >= 2, results };
  }

  async checkAuthEndpoints() {
    console.log('🔐 Checking authentication endpoints...');
    
    const endpoints = [
      { path: '/api/auth/providers', name: 'Auth Providers' },
      { path: '/api/auth/test-login', name: 'Test Login API' },
      { path: '/login', name: 'Login Page' }
    ];
    
    const results = [];
    for (const { path, name } of endpoints) {
      try {
        const url = `${this.deploymentUrl}${path}`;
        const response = await this.fetchWithTimeout(url);
        
        const passed = response.status === 200;
        console.log(`  ${passed ? '✅' : '❌'} ${name} - ${response.status}`);
        results.push({ endpoint: path, name, passed, status: response.status });
      } catch (error) {
        console.log(`  ❌ ${name} - Failed: ${error.message}`);
        results.push({ endpoint: path, name, passed: false, error: error.message });
      }
    }
    
    return { passed: results.filter(r => r.passed).length >= 2, results };
  }

  async runE2ETests() {
    console.log('🧪 Running end-to-end tests...');
    
    const tests = [
      {
        name: 'Homepage loads correctly',
        test: async () => {
          const response = await this.fetchWithTimeout(this.deploymentUrl);
          const html = await response.text();
          return response.status === 200 && (html.includes('Fantasy Football') || html.includes('AstralField'));
        }
      },
      {
        name: 'ESPN API integration works',
        test: async () => {
          const response = await this.fetchWithTimeout(`${this.deploymentUrl}/api/espn/scoreboard`);
          const data = await response.json();
          return response.status === 200 && (data.success || data.data);
        }
      },
      {
        name: 'Login page accessible',
        test: async () => {
          const response = await this.fetchWithTimeout(`${this.deploymentUrl}/login`);
          return response.status === 200;
        }
      },
      {
        name: 'Test login API functional',
        test: async () => {
          const response = await this.fetchWithTimeout(`${this.deploymentUrl}/api/auth/test-login`);
          const data = await response.json();
          return response.status === 200 && data.users;
        }
      }
    ];
    
    const results = [];
    for (const { name, test } of tests) {
      try {
        const passed = await test();
        console.log(`  ${passed ? '✅' : '❌'} ${name}`);
        results.push({ name, passed });
      } catch (error) {
        console.log(`  ❌ ${name} - Error: ${error.message}`);
        results.push({ name, passed: false, error: error.message });
      }
    }
    
    return { passed: results.filter(r => r.passed).length >= 3, results };
  }

  async runDiagnostics() {
    console.log('\n🔍 Running deployment diagnostics...');
    
    try {
      // Check Vercel logs
      console.log('📋 Checking recent deployment logs...');
      const { stdout: logs } = await execAsync('vercel logs --output raw -n 50', { timeout: 15000 });
      
      // Analyze logs for common issues
      const errorPatterns = [
        { pattern: /Module not found/i, issue: 'Missing Dependencies', fix: 'npm install && vercel --prod' },
        { pattern: /Prisma.*not.*generated/i, issue: 'Prisma Client Not Generated', fix: 'npx prisma generate && vercel --prod' },
        { pattern: /Environment.*variable.*not.*found/i, issue: 'Missing Environment Variables', fix: 'Check vercel env ls' },
        { pattern: /Build.*failed/i, issue: 'Build Failure', fix: 'Check build logs and fix TypeScript/lint errors' },
        { pattern: /timeout/i, issue: 'Function Timeout', fix: 'Optimize slow functions or increase timeout' },
        { pattern: /Database.*connection/i, issue: 'Database Connection', fix: 'Verify DATABASE_URL is correct' },
        { pattern: /Auth.*error/i, issue: 'Authentication Error', fix: 'Check Auth0 configuration' }
      ];
      
      const foundIssues = [];
      errorPatterns.forEach(({ pattern, issue, fix }) => {
        if (pattern.test(logs)) {
          foundIssues.push({ issue, fix });
          console.log(`❌ Found: ${issue}`);
          console.log(`🔧 Suggested fix: ${fix}`);
        }
      });
      
      if (foundIssues.length === 0) {
        console.log('✅ No obvious issues found in logs');
        console.log('💡 Recent log entries:');
        console.log(logs.slice(-500));
      }
      
      // Check deployment status
      try {
        const { stdout: inspectOutput } = await execAsync('vercel inspect --json', { timeout: 10000 });
        const deployment = JSON.parse(inspectOutput);
        console.log(`📊 Deployment state: ${deployment.readyState}`);
        console.log(`🔗 Deployment URL: ${deployment.url}`);
      } catch (error) {
        console.log('⚠️ Could not get detailed deployment info');
      }
      
    } catch (error) {
      console.error('Diagnostics failed:', error.message);
    }
  }

  async handleDeploymentError(error) {
    console.log('\n🚨 Handling deployment error:', error);
    
    const fixes = {
      'BUILD_FAILED': async () => {
        console.log('🔧 Attempting to fix build issues...');
        if (await this.fileExists('scripts/fix-build.js')) {
          await execAsync('node scripts/fix-build.js');
        }
        await execAsync('npm run build');
        await execAsync('vercel --prod --yes');
      },
      'ENV_VAR_MISSING': async () => {
        console.log('🔧 Checking environment variables...');
        await execAsync('vercel env ls');
        console.log('Please ensure all required environment variables are set');
      },
      'TIMEOUT': async () => {
        console.log('🔧 Deployment timed out, retrying...');
        await execAsync('vercel --prod --yes');
      }
    };
    
    if (fixes[error]) {
      try {
        await fixes[error]();
      } catch (fixError) {
        console.error('Auto-fix failed:', fixError.message);
      }
    } else {
      console.log('🔍 Unknown error - check Vercel dashboard for details');
    }
  }

  async suggestFixes(results) {
    console.log('\n🔧 Suggested fixes for failed checks:');
    
    results.forEach(result => {
      if (!result.passed && result.error) {
        if (result.error.includes('network') || result.error.includes('timeout')) {
          console.log('- Check network connectivity and function timeouts');
        } else if (result.error.includes('500')) {
          console.log('- Check server logs for internal errors');
          console.log('- Verify database connection and environment variables');
        } else if (result.error.includes('404')) {
          console.log('- Verify API routes are correctly deployed');
          console.log('- Check next.config.js configuration');
        }
      }
    });
  }

  async fetchWithTimeout(url, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Fantasy-Football-Monitor/1.0'
        }
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async fileExists(filePath) {
    try {
      const fs = require('fs').promises;
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run monitor if called directly
if (require.main === module) {
  const deploymentUrl = process.argv[2];
  if (!deploymentUrl) {
    console.error('❌ Please provide deployment URL as argument');
    process.exit(1);
  }
  
  const monitor = new DeploymentMonitor(deploymentUrl);
  monitor.monitor().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Monitoring failed:', error.message);
    process.exit(1);
  });
}

module.exports = DeploymentMonitor;