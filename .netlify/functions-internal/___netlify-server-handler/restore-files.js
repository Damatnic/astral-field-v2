const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Kill any git processes and remove lock file
try {
  execSync('taskkill /F /IM git.exe 2>nul', { stdio: 'ignore' });
} catch (e) {}

try {
  fs.unlinkSync('.git/index.lock');
} catch (e) {}

try {
  fs.unlinkSync('.git/index.lock');
} catch (e) {}

// Wait a moment
setTimeout(() => {
  try {
    // Try to restore files
    execSync('git checkout HEAD -- src/', { stdio: 'inherit' });
    console.log('✅ Successfully restored src/ files');
  } catch (error) {
    console.error('❌ Git restore failed:', error.message);
    
    // Try alternative approach
    try {
      execSync('git reset --hard HEAD', { stdio: 'inherit' });
      console.log('✅ Successfully reset to HEAD');
    } catch (resetError) {
      console.error('❌ Git reset failed:', resetError.message);
      console.log('Manual intervention required');
    }
  }
}, 2000);