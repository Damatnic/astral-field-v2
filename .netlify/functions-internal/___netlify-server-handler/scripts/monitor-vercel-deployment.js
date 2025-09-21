// Monitor Vercel Deployment
// Watches Vercel deployment status and validates when ready

const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function checkDeploymentStatus() {
  try {
    const { stdout } = await execAsync('vercel ls --scope=team_astral-field');
    return stdout;
  } catch (error) {
    // Try without scope
    try {
      const { stdout } = await execAsync('vercel ls');
      return stdout;
    } catch (fallbackError) {
      throw new Error(`Failed to check deployment status: ${fallbackError.message}`);
    }
  }
}

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AstralField-Monitor/1.0',
        ...options.headers,
      },
      timeout: 10000,
    };

    const req = https.request(requestOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    req.end();
  });
}

async function waitForDeployment(url, maxAttempts = 60, intervalMs = 10000) {
  console.log(`🔍 Monitoring deployment at: ${url}`);
  console.log(`⏱️  Checking every ${intervalMs/1000} seconds (max ${maxAttempts} attempts)`);
  console.log('');

  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[${elapsed}s] Attempt ${attempt}/${maxAttempts} - Checking deployment...`);
    
    try {
      // Test basic connectivity
      const basicTest = await makeRequest(`${url}/api/sleeper/integration?action=status`);
      
      if (basicTest.status === 200) {
        console.log(`✅ Deployment is live! (${basicTest.status})`);
        
        // Test if Sleeper integration is working
        try {
          const sleeperTest = await makeRequest(`${url}/api/sleeper/integration?action=health`);
          
          if (sleeperTest.status === 200) {
            console.log(`✅ Sleeper integration is working!`);
            
            if (sleeperTest.data?.data?.overall === 'healthy') {
              console.log(`✅ All services are healthy!`);
              
              const totalTime = Math.round((Date.now() - startTime) / 1000);
              console.log(`\n🎉 DEPLOYMENT SUCCESSFUL! (${totalTime}s)`);
              console.log(`🔗 Live URL: ${url}`);
              
              return true;
            } else {
              console.log(`⚠️  Services starting up... (${sleeperTest.data?.data?.overall || 'unknown'})`);
            }
          } else {
            console.log(`⚠️  Sleeper integration not ready (${sleeperTest.status})`);
          }
        } catch (sleeperError) {
          console.log(`⚠️  Sleeper integration test failed: ${sleeperError.message}`);
        }
      } else if (basicTest.status === 404) {
        console.log(`⚠️  API not found (${basicTest.status}) - deployment may still be building`);
      } else {
        console.log(`⚠️  Unexpected response (${basicTest.status})`);
      }
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.log(`⚠️  Deployment not yet available (${error.code})`);
      } else {
        console.log(`⚠️  Connection error: ${error.message}`);
      }
    }
    
    if (attempt < maxAttempts) {
      console.log(`   Waiting ${intervalMs/1000} seconds before next check...`);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n❌ DEPLOYMENT TIMEOUT after ${totalTime}s`);
  console.log(`Could not confirm successful deployment after ${maxAttempts} attempts.`);
  
  return false;
}

async function getLatestDeployment() {
  try {
    console.log('🔍 Getting latest deployment info...');
    
    const { stdout } = await execAsync('vercel ls --json');
    const deployments = JSON.parse(stdout);
    
    if (deployments && deployments.length > 0) {
      const latest = deployments[0];
      console.log(`📦 Latest deployment: ${latest.name}`);
      console.log(`🔗 URL: https://${latest.url}`);
      console.log(`📅 Created: ${new Date(latest.createdAt).toLocaleString()}`);
      console.log(`📊 State: ${latest.state}`);
      
      return `https://${latest.url}`;
    } else {
      throw new Error('No deployments found');
    }
  } catch (error) {
    console.log(`⚠️  Could not get deployment info: ${error.message}`);
    
    // Fallback to known URL
    const fallbackUrl = 'https://astral-field-v1.vercel.app';
    console.log(`🔄 Using fallback URL: ${fallbackUrl}`);
    return fallbackUrl;
  }
}

async function monitorVercelDeployment() {
  console.log('🚀 MONITORING VERCEL DEPLOYMENT');
  console.log('===============================');
  console.log('');

  try {
    // Get the latest deployment URL
    const deploymentUrl = await getLatestDeployment();
    console.log('');

    // Wait for deployment to be ready
    const success = await waitForDeployment(deploymentUrl);
    
    if (success) {
      console.log('\n🎊 DEPLOYMENT MONITORING COMPLETE!');
      console.log('✅ Vercel deployment is live and healthy');
      console.log('✅ Sleeper integration is operational');
      console.log('✅ All systems ready for production use');
      console.log('');
      console.log('🔗 Production URLs:');
      console.log(`   Main: ${deploymentUrl}`);
      console.log(`   Health: ${deploymentUrl}/api/sleeper/integration?action=health`);
      console.log(`   Players: ${deploymentUrl}/api/sleeper/sync?type=fantasy`);
      console.log('');
      console.log('🏈 D\'Amato Dynasty League is ready!');
      
      return true;
    } else {
      console.log('\n❌ DEPLOYMENT MONITORING FAILED');
      console.log('Deployment may be taking longer than expected.');
      console.log('Manual verification recommended.');
      
      return false;
    }
  } catch (error) {
    console.error('💥 Monitoring failed:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  monitorVercelDeployment()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('💥 Monitor crashed:', error.message);
      process.exit(1);
    });
}

module.exports = { monitorVercelDeployment, waitForDeployment };