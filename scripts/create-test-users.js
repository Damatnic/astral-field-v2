const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udqlhdagqjbhkswzgitj.supabase.co'
const supabaseServiceKey = 'sb_secret_ZD550ahg4-Lx_GNjX2Aevw_Vm6cpH9l'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const testUsers = [
  { email: 'nicholas.damato@astralfield.com', username: 'Nicholas D\'Amato', password: 'AstralField2024!', isAdmin: true },
  { email: 'brittany.bergum@astralfield.com', username: 'Brittany Bergum', password: 'AstralField2024!' },
  { email: 'cason.minor@astralfield.com', username: 'Cason Minor', password: 'AstralField2024!' },
  { email: 'david.jarvey@astralfield.com', username: 'David Jarvey', password: 'AstralField2024!' },
  { email: 'jack.mccaigue@astralfield.com', username: 'Jack McCaigue', password: 'AstralField2024!' },
  { email: 'jon.kornbeck@astralfield.com', username: 'Jon Kornbeck', password: 'AstralField2024!' },
  { email: 'kaity.lorbiecki@astralfield.com', username: 'Kaity Lorbiecki', password: 'AstralField2024!' },
  { email: 'larry.mccaigue@astralfield.com', username: 'Larry McCaigue', password: 'AstralField2024!' },
  { email: 'nick.hartley@astralfield.com', username: 'Nick Hartley', password: 'AstralField2024!' },
  { email: 'renee.mccaigue@astralfield.com', username: 'Renee McCaigue', password: 'AstralField2024!' }
]

async function createTestUsers() {
  console.log('🚀 Creating test users for Astral Field...\n')
  
  for (const user of testUsers) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      })
      
      if (authError) {
        console.log(`❌ Error creating auth for ${user.username}: ${authError.message}`)
        continue
      }
      
      // Create user profile in database
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: user.email,
          username: user.username,
          avatar_url: null
        })
      
      if (profileError) {
        console.log(`❌ Error creating profile for ${user.username}: ${profileError.message}`)
      } else {
        console.log(`✅ Created user: ${user.username} (${user.email})`)
      }
      
    } catch (error) {
      console.log(`❌ Unexpected error for ${user.username}: ${error.message}`)
    }
  }
  
  console.log('\n🎉 Test user creation complete!')
  console.log('\n📋 Login credentials (all users have password: AstralField2024!):')
  console.log('═'.repeat(60))
  testUsers.forEach(user => {
    console.log(`${user.username.padEnd(20)} | ${user.email}`)
  })
  console.log('═'.repeat(60))
}

createTestUsers().catch(console.error)