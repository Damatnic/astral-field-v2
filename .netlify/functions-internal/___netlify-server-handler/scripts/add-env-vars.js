#!/usr/bin/env node

const { execSync } = require('child_process');

const envVars = [
  { name: 'NEXTAUTH_SECRET', value: '4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis=' },
  { name: 'NEXTAUTH_URL', value: 'https://astral-field-v1.vercel.app' },
  { name: 'AUTH0_SECRET', value: 'eJ984INJetDPrysB7C5jPskPW8mw8vaRl-ya456K06Dj-zElQLz-q3hB1eyXohZZ' },
  { name: 'AUTH0_BASE_URL', value: 'https://astral-field-v1.vercel.app' },
  { name: 'AUTH0_ISSUER_BASE_URL', value: 'https://dev-ac3ajs327vs5vzhk.us.auth0.com' },
  { name: 'AUTH0_CLIENT_ID', value: 'hqbzaW4XOvGR8nfqsFx6r80WLKq19xkb' },
  { name: 'AUTH0_CLIENT_SECRET', value: 'eJ984INJetDPrysB7C5jPskPW8mw8vaRl-ya456K06Dj-zElQLz-q3hB1eyXohZZ' },
  { name: 'NEXT_PUBLIC_APP_URL', value: 'https://astral-field-v1.vercel.app' }
];

console.log('Adding environment variables to Vercel...');

for (const envVar of envVars) {
  try {
    console.log(`Adding ${envVar.name}...`);
    
    // Create a temporary file with the value
    const fs = require('fs');
    const tempFile = `.temp_${envVar.name}`;
    fs.writeFileSync(tempFile, envVar.value);
    
    // Add the environment variable
    execSync(`npx vercel env add ${envVar.name} production < ${tempFile}`, { 
      stdio: 'inherit'
    });
    
    // Clean up temp file
    fs.unlinkSync(tempFile);
    
    console.log(`✅ Added ${envVar.name}`);
  } catch (error) {
    if (error.message.includes('already been added')) {
      console.log(`⚠️  ${envVar.name} already exists`);
    } else {
      console.error(`❌ Failed to add ${envVar.name}:`, error.message);
    }
  }
}

console.log('Environment variables setup complete!');