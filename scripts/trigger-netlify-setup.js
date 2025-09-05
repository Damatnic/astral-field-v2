// Script to trigger database and profile setup on Netlify
const BASE_URL = process.env.NETLIFY_URL || 'https://your-app.netlify.app' // Update with your Netlify URL

async function triggerSetup() {
  console.log('🚀 Triggering Netlify database and profile setup...\n')
  
  try {
    // Step 1: Setup database tables
    console.log('1️⃣ Setting up database tables...')
    const dbResponse = await fetch(`${BASE_URL}/api/setup-database`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!dbResponse.ok) {
      throw new Error(`Database setup failed: ${dbResponse.status}`)
    }
    
    const dbResult = await dbResponse.json()
    console.log('✅ Database setup result:', dbResult.message)
    console.log('   Tables created:', dbResult.tables?.join(', ') || 'None')
    
    // Step 2: Create user profiles
    console.log('\n2️⃣ Creating user profiles...')
    const profilesResponse = await fetch(`${BASE_URL}/api/setup-profiles`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!profilesResponse.ok) {
      throw new Error(`Profiles setup failed: ${profilesResponse.status}`)
    }
    
    const profilesResult = await profilesResponse.json()
    console.log('✅ Profiles setup result:', profilesResult.message)
    
    if (profilesResult.results) {
      console.log(`   Created: ${profilesResult.results.created}`)
      console.log(`   Existing: ${profilesResult.results.existing}`)
      console.log(`   Errors: ${profilesResult.results.errors}`)
    }
    
    // Step 3: Verify setup
    console.log('\n3️⃣ Verifying setup...')
    const statusResponse = await fetch(`${BASE_URL}/api/setup-profiles`)
    const statusResult = await statusResponse.json()
    
    console.log(`✅ Total users in database: ${statusResult.count}`)
    
    console.log('\n🎉 Netlify setup complete!')
    console.log(`\n🔗 Admin panel: ${BASE_URL}/admin/setup`)
    console.log(`🔗 Login page: ${BASE_URL}/auth/login`)
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('1. Make sure your Netlify app is deployed')
    console.log('2. Update the BASE_URL in this script')
    console.log('3. Check that environment variables are set in Netlify')
  }
}

// Run the setup
triggerSetup().catch(console.error)