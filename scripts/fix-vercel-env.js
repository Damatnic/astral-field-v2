const { execSync } = require('child_process');

const ENV_VARS = {
  DATABASE_URL: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  DIRECT_DATABASE_URL: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  NEXTAUTH_SECRET: '4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis=',
  NEXTAUTH_URL: 'https://astralfield-fantasy.vercel.app',
  NODE_ENV: 'production',
  NEXT_PUBLIC_APP_URL: 'https://astralfield-fantasy.vercel.app',
  AUTH0_CLIENT_ID: 'eFN3pDJfJT5nKM18r9gVqnWXq8kRLhBb',
  AUTH0_CLIENT_SECRET: 'B5-0J6bKhjw5LjzOZzsJa1bw4-Pr1GhjBQCiFU5GI2j93k3PSZiORWd9gY9dL7FX',
  AUTH0_ISSUER: 'https://dev-j5y3v7zscskzg7ak.us.auth0.com',
  AUTH0_DOMAIN: 'dev-j5y3v7zscskzg7ak.us.auth0.com',
  NEXT_PUBLIC_SLEEPER_BASE_URL: 'https://api.sleeper.app/v1',
  SLEEPER_BASE_URL: 'https://api.sleeper.app/v1',
  JWT_SECRET: '4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis='
};

console.log('Fixing Vercel environment variables...\n');

// First, list all current env vars
console.log('Current environment variables:');
try {
  execSync('vercel env ls', { stdio: 'inherit' });
} catch (error) {
  console.log('Could not list environment variables');
}

console.log('\nRemoving and re-adding environment variables...\n');

Object.entries(ENV_VARS).forEach(([key, value]) => {
  try {
    // Try to remove first (ignore errors if doesn't exist)
    try {
      execSync(`vercel env rm ${key} production --yes`, { stdio: 'pipe' });
      console.log(`Removed old ${key}`);
    } catch (e) {
      // Variable doesn't exist, that's fine
    }
    
    // Add the variable
    execSync(`echo "${value}" | vercel env add ${key} production`, { stdio: 'pipe' });
    console.log(`✓ ${key} set successfully`);
  } catch (error) {
    console.error(`✗ Failed to set ${key}: ${error.message}`);
  }
});

console.log('\n✓ All environment variables fixed!');
console.log('\nDeploying to Vercel Pro...');

// Now deploy
execSync('vercel --prod --yes', { stdio: 'inherit' });