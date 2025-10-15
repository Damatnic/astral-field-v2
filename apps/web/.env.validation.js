/**
 * Environment Variable Validation
 * Validates required environment variables on startup
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'DIRECT_DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET'
]

const optionalEnvVars = [
  'AUTH0_DOMAIN',
  'AUTH0_CLIENT_ID',
  'AUTH0_CLIENT_SECRET',
  'ESPN_BASE_URL',
  'REDIS_URL',
  'SENTRY_DSN'
]

function validateEnv() {
  const missing = []
  const warnings = []

  // Check required variables
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName)
    }
  }

  // Check optional but recommended variables
  for (const varName of optionalEnvVars) {
    if (!process.env[varName]) {
      warnings.push(varName)
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(v => console.error(`   - ${v}`))
    console.error('\nPlease check your .env.local file')
    process.exit(1)
  }

  if (warnings.length > 0 && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Missing optional environment variables:')
    warnings.forEach(v => console.warn(`   - ${v}`))
  }

  console.log('✅ Environment variables validated')
}

// Run validation
if (require.main === module) {
  validateEnv()
}

module.exports = { validateEnv }
