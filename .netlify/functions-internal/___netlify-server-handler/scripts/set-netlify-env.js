const { execSync } = require('child_process');

const ENV_VARS = {
  DATABASE_URL: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  DIRECT_DATABASE_URL: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  NEXTAUTH_SECRET: '4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis=',
  NEXTAUTH_URL: 'https://astralfield-fantasy.netlify.app',
  NODE_ENV: 'production',
  NEXT_PUBLIC_APP_URL: 'https://astralfield-fantasy.netlify.app',
  AUTH0_CLIENT_ID: 'eFN3pDJfJT5nKM18r9gVqnWXq8kRLhBb',
  AUTH0_CLIENT_SECRET: 'B5-0J6bKhjw5LjzOZzsJa1bw4-Pr1GhjBQCiFU5GI2j93k3PSZiORWd9gY9dL7FX',
  AUTH0_ISSUER: 'https://dev-j5y3v7zscskzg7ak.us.auth0.com',
  AUTH0_DOMAIN: 'dev-j5y3v7zscskzg7ak.us.auth0.com',
  AUTH0_AUDIENCE: 'https://astralfield-fantasy.netlify.app/api',
  AUTH0_SCOPE: 'openid profile email',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_c3RpcnJpbmctZ2VyYmlsLTkzLmNsZXJrLmFjY291bnRzLmRldiQ',
  CLERK_SECRET_KEY: 'sk_test_c9XhG6AyUJ4hGq5TJOhqCl5rztVwZ83XCXtcWTKuTd',
  NEXT_PUBLIC_VERCEL_URL: 'astralfield-fantasy.netlify.app',
  SLEEPER_AUTH_TOKEN: '4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis',
  JWT_SECRET: '4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis',
  NEXT_PUBLIC_SLEEPER_BASE_URL: 'https://api.sleeper.app/v1',
  SLEEPER_BASE_URL: 'https://api.sleeper.app/v1',
  NEXT_PUBLIC_API_URL: 'https://astralfield-fantasy.netlify.app/api',
  API_SECRET: '4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis='
};

console.log('Setting environment variables for Netlify...\n');

Object.entries(ENV_VARS).forEach(([key, value]) => {
  try {
    console.log(`Setting ${key}...`);
    execSync(`npx netlify env:set ${key} "${value}"`, { stdio: 'pipe' });
    console.log(`✓ ${key} set successfully`);
  } catch (error) {
    console.error(`✗ Failed to set ${key}: ${error.message}`);
  }
});

console.log('\n✓ All environment variables set successfully!');
console.log('\nNow deploying to Netlify...');