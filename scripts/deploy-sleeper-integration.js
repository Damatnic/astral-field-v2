// Deploy Sleeper Integration Script
// Handles complete deployment and initialization of Sleeper API integration

const https = require('https');
const http = require('http');

// Configuration
const config = {
  local: {
    host: 'localhost',
    port: 3000,
    protocol: 'http'
  },
  production: {
    host: 'astral-field-v1.vercel.app',
    port: 443,
    protocol: 'https'
  }
};

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const client = options.protocol === 'https' ? https : http;
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null,
          };
          resolve(result);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body,
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function waitForServer(environment = 'local', maxAttempts = 30) {
  const env = config[environment];
  console.log(`⏳ Waiting for ${environment} server at ${env.protocol}://${env.host}:${env.port}...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await makeRequest({
        hostname: env.host,
        port: env.port,
        path: '/api/sleeper/integration?action=status',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });
      
      if (result.status === 200) {
        console.log(`✅ Server is ready! (attempt ${attempt}/${maxAttempts})`);
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    console.log(`   Attempt ${attempt}/${maxAttempts} - waiting 2 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`❌ Server not ready after ${maxAttempts} attempts`);
  return false;
}

async function deploySleeperIntegration(environment = 'local') {
  const env = config[environment];
  
  console.log('🚀 DEPLOYING SLEEPER INTEGRATION');
  console.log('=================================');
  console.log(`Environment: ${environment}`);
  console.log(`Target: ${env.protocol}://${env.host}:${env.port}`);
  console.log('');

  const steps = [
    {
      name: 'Server Connectivity Check',
      endpoint: '/api/sleeper/integration?action=status',
      method: 'GET',
      description: 'Verify server is running and responsive',
    },
    {
      name: 'Initialize Sleeper Integration',
      endpoint: '/api/sleeper/integration',
      method: 'POST',
      data: { action: 'initialize' },
      description: 'Initialize all Sleeper API services',
    },
    {
      name: 'Health Check',
      endpoint: '/api/sleeper/integration?action=health',
      method: 'GET',
      description: 'Verify all services are healthy',
    },
    {
      name: 'Quick Setup for D\'Amato Dynasty League',
      endpoint: '/api/sleeper/integration',
      method: 'POST',
      data: { action: 'quick_setup' },
      description: 'Complete setup for dynasty league',
    },
    {
      name: 'Start Live Scoring',
      endpoint: '/api/sleeper/scores',
      method: 'POST',
      data: { 
        action: 'start_live_updates',
        options: { intervalMs: 60000 }
      },
      description: 'Enable real-time scoring updates',
    },
    {
      name: 'Final Health Verification',
      endpoint: '/api/sleeper/integration?action=health',
      method: 'GET',
      description: 'Confirm all systems operational',
    },
  ];

  let successCount = 0;
  const results = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`${i + 1}️⃣ ${step.name}`);
    console.log(`   ${step.description}`);
    
    try {
      const result = await makeRequest({
        hostname: env.host,
        port: env.port,
        path: step.endpoint,
        method: step.method,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout for long operations
      }, step.data);

      if (result.status >= 200 && result.status < 300) {
        console.log(`   ✅ Success (${result.status})`);
        
        // Log important details
        if (result.data && result.data.result) {
          if (result.data.result.nflState) {
            console.log(`   📊 NFL: Season ${result.data.result.nflState.season}, Week ${result.data.result.nflState.week}`);
          }
          if (result.data.result.playerCount) {
            console.log(`   👥 Players: ${result.data.result.playerCount} fantasy relevant`);
          }
          if (result.data.result.summary) {
            const summary = result.data.result.summary;
            console.log(`   📈 Sync: ${summary.playersProcessed} players, ${summary.leaguesProcessed} leagues`);
          }
        }
        
        successCount++;
        results.push({ step: step.name, status: 'success', details: result.data });
      } else {
        console.log(`   ❌ Failed (${result.status}): ${result.data?.error || 'Unknown error'}`);
        results.push({ step: step.name, status: 'failed', error: result.data });
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({ step: step.name, status: 'error', error: error.message });
    }
    
    console.log('');
  }

  // Summary
  console.log('📊 DEPLOYMENT SUMMARY');
  console.log('=====================');
  console.log(`✅ Successful steps: ${successCount}/${steps.length}`);
  console.log(`❌ Failed steps: ${steps.length - successCount}/${steps.length}`);
  
  if (successCount === steps.length) {
    console.log('\n🎉 DEPLOYMENT SUCCESSFUL!');
    console.log('Sleeper integration is now fully operational.');
    console.log('');
    console.log('🔗 Available Endpoints:');
    console.log(`   Health: ${env.protocol}://${env.host}:${env.port}/api/sleeper/integration?action=health`);
    console.log(`   Players: ${env.protocol}://${env.host}:${env.port}/api/sleeper/sync?type=fantasy`);
    console.log(`   Leagues: ${env.protocol}://${env.host}:${env.port}/api/sleeper/league`);
    console.log(`   Scoring: ${env.protocol}://${env.host}:${env.port}/api/sleeper/scores`);
    
    return true;
  } else {
    console.log('\n⚠️ DEPLOYMENT INCOMPLETE');
    console.log('Some steps failed. Check the errors above.');
    
    // Show failed steps
    const failed = results.filter(r => r.status !== 'success');
    if (failed.length > 0) {
      console.log('\n❌ Failed Steps:');
      failed.forEach(f => {
        console.log(`   - ${f.step}: ${f.error || 'Unknown error'}`);
      });
    }
    
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'local';
  
  if (!config[environment]) {
    console.error(`❌ Invalid environment: ${environment}`);
    console.error(`Available environments: ${Object.keys(config).join(', ')}`);
    process.exit(1);
  }

  try {
    // Wait for server to be ready
    const serverReady = await waitForServer(environment);
    if (!serverReady) {
      console.error('❌ Server is not ready. Please start the server first.');
      process.exit(1);
    }

    // Deploy integration
    const success = await deploySleeperIntegration(environment);
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { deploySleeperIntegration, waitForServer };