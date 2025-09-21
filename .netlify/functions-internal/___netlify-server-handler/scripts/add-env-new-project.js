#!/usr/bin/env node

/**
 * Add Environment Variables to New Vercel Project
 */

const { execSync } = require('child_process');
const fs = require('fs');

const ENV_VARS = [
  // Database
  { name: 'DATABASE_URL', value: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' },
  { name: 'DATABASE_URL_UNPOOLED', value: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' },
  
  // Postgres
  { name: 'POSTGRES_URL', value: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' },
  { name: 'POSTGRES_URL_NON_POOLING', value: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' },
  { name: 'POSTGRES_USER', value: 'neondb_owner' },
  { name: 'POSTGRES_HOST', value: 'ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech' },
  { name: 'POSTGRES_PASSWORD', value: 'npg_rkDs2yUYZEQ7' },
  { name: 'POSTGRES_DATABASE', value: 'neondb' },
  { name: 'POSTGRES_PRISMA_URL', value: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?connect_timeout=15&sslmode=require' },
  
  // Auth
  { name: 'NEXTAUTH_SECRET', value: '4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis=' },
  { name: 'NEXTAUTH_URL', value: 'https://astralfield-fantasy.vercel.app' },
  
  // App URLs
  { name: 'NEXT_PUBLIC_APP_URL', value: 'https://astralfield-fantasy.vercel.app' },
  
  // Stack Auth
  { name: 'NEXT_PUBLIC_STACK_PROJECT_ID', value: '8ae5529b-56ad-4132-ae99-cc530d7e22cb' },
  { name: 'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY', value: 'pck_gv9b0kp5fa6668yrx3y5nbrka53r2fket039jwq0k0wvg' },
  { name: 'STACK_SECRET_SERVER_KEY', value: 'ssk_ab99sq01f594aja1xys9xft7andsvfeybnf9y2mmx6crg' },
  
  // Auth0 (if needed)
  { name: 'AUTH0_SECRET', value: 'eJ984INJetDPrysB7C5jPskPW8mw8vaRl-ya456K06Dj-zElQLz-q3hB1eyXohZZ' },
  { name: 'AUTH0_BASE_URL', value: 'https://astralfield-fantasy.vercel.app' },
  { name: 'AUTH0_ISSUER_BASE_URL', value: 'https://dev-ac3ajs327vs5vzhk.us.auth0.com' },
  { name: 'AUTH0_CLIENT_ID', value: 'hqbzaW4XOvGR8nfqsFx6r80WLKq19xkb' },
  { name: 'AUTH0_CLIENT_SECRET', value: 'eJ984INJetDPrysB7C5jPskPW8mw8vaRl-ya456K06Dj-zElQLz-q3hB1eyXohZZ' },
  
  // Node
  { name: 'NODE_ENV', value: 'production' }
];

console.log('🚀 Adding environment variables to new Vercel project...\n');

let addedCount = 0;
let failedCount = 0;

for (const envVar of ENV_VARS) {
  try {
    console.log(`Adding ${envVar.name}...`);
    
    // Create temp file with the value
    const tempFile = `.temp_${envVar.name}`;
    fs.writeFileSync(tempFile, envVar.value);
    
    try {
      // Add to all environments
      execSync(`npx vercel env add ${envVar.name} production < ${tempFile}`, { 
        stdio: 'pipe' 
      });
      console.log(`✅ Added ${envVar.name}`);
      addedCount++;
    } catch (error) {
      if (error.message && error.message.includes('already been added')) {
        console.log(`⚠️  ${envVar.name} already exists`);
      } else {
        console.log(`❌ Failed to add ${envVar.name}`);
        failedCount++;
      }
    }
    
    // Clean up temp file
    fs.unlinkSync(tempFile);
    
  } catch (error) {
    console.error(`❌ Error with ${envVar.name}:`, error.message);
    failedCount++;
  }
}

console.log('\n📊 Summary:');
console.log(`✅ Added: ${addedCount} variables`);
console.log(`❌ Failed: ${failedCount} variables`);

console.log('\n🔄 Triggering new deployment with environment variables...');
try {
  execSync('npx vercel --prod --yes', { stdio: 'inherit' });
  console.log('✅ Deployment triggered successfully');
} catch (error) {
  console.log('❌ Deployment trigger failed:', error.message);
}

console.log('\n✨ Done!');