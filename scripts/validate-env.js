#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Validates that all required environment variables are set
 * Run this at application startup to catch configuration issues early
 */

const fs = require('fs');
const path = require('path');

// Required environment variables
const REQUIRED_VARS = {
  // Database
  DATABASE_URL: {
    description: 'PostgreSQL database connection string',
    example: 'postgresql://user:password@localhost:5432/dbname',
    required: true,
    validate: (value) => value.startsWith('postgresql://') || value.startsWith('postgres://')
  },

  // Authentication
  AUTH_SECRET: {
    description: 'Secret key for JWT signing (min 32 characters)',
    example: 'your-super-secret-key-min-32-chars',
    required: true,
    validate: (value) => value.length >= 32
  },

  NEXTAUTH_URL: {
    description: 'Base URL of the application',
    example: 'http://localhost:3000',
    required: true,
    validate: (value) => value.startsWith('http://') || value.startsWith('https://')
  },

  // Node Environment
  NODE_ENV: {
    description: 'Node environment (development, production, test)',
    example: 'development',
    required: true,
    validate: (value) => ['development', 'production', 'test'].includes(value)
  }
};

// Optional but recommended environment variables
const OPTIONAL_VARS = {
  // Authentication
  NEXTAUTH_SECRET: {
    description: 'Alternative to AUTH_SECRET for NextAuth',
    example: 'your-super-secret-key-min-32-chars'
  },

  AUTH_TRUST_HOST: {
    description: 'Trust host header (set to true for Vercel)',
    example: 'true'
  },

  AUTH_DEBUG: {
    description: 'Enable authentication debugging',
    example: 'false'
  },

  // Session
  SESSION_MAX_AGE: {
    description: 'Session max age in seconds',
    example: '86400'
  },

  // API Keys (if using external services)
  SLEEPER_API_KEY: {
    description: 'Sleeper API key for fantasy data',
    example: 'your-sleeper-api-key'
  },

  ESPN_API_KEY: {
    description: 'ESPN API key for fantasy data',
    example: 'your-espn-api-key'
  },

  // Monitoring
  SENTRY_DSN: {
    description: 'Sentry DSN for error tracking',
    example: 'https://xxx@sentry.io/xxx'
  },

  // Analytics
  NEXT_PUBLIC_GA_ID: {
    description: 'Google Analytics ID',
    example: 'G-XXXXXXXXXX'
  }
};

class EnvValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  validate() {
    console.log('\n' + '='.repeat(80));
    console.log('Environment Variable Validation');
    console.log('='.repeat(80) + '\n');

    // Check required variables
    console.log('Checking required environment variables...\n');
    Object.entries(REQUIRED_VARS).forEach(([key, config]) => {
      this.validateRequired(key, config);
    });

    // Check optional variables
    console.log('\nChecking optional environment variables...\n');
    Object.entries(OPTIONAL_VARS).forEach(([key, config]) => {
      this.validateOptional(key, config);
    });

    // Generate report
    this.generateReport();

    // Return validation result
    return this.errors.length === 0;
  }

  validateRequired(key, config) {
    const value = process.env[key];

    if (!value) {
      this.errors.push({
        key,
        message: `Missing required environment variable: ${key}`,
        description: config.description,
        example: config.example
      });
      console.log(`❌ ${key}: MISSING (REQUIRED)`);
      return;
    }

    if (config.validate && !config.validate(value)) {
      this.errors.push({
        key,
        message: `Invalid value for ${key}`,
        description: config.description,
        example: config.example
      });
      console.log(`❌ ${key}: INVALID`);
      return;
    }

    console.log(`✅ ${key}: OK`);
  }

  validateOptional(key, config) {
    const value = process.env[key];

    if (!value) {
      this.warnings.push({
        key,
        message: `Optional environment variable not set: ${key}`,
        description: config.description,
        example: config.example
      });
      console.log(`⚠️  ${key}: NOT SET (optional)`);
      return;
    }

    console.log(`✅ ${key}: OK`);
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('Validation Summary');
    console.log('='.repeat(80) + '\n');

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All environment variables are properly configured!\n');
      return;
    }

    // Errors
    if (this.errors.length > 0) {
      console.log(`❌ ${this.errors.length} Error(s):\n`);
      this.errors.forEach(({ key, message, description, example }) => {
        console.log(`  ${key}:`);
        console.log(`    ${message}`);
        console.log(`    Description: ${description}`);
        console.log(`    Example: ${example}`);
        console.log('');
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log(`⚠️  ${this.warnings.length} Warning(s):\n`);
      this.warnings.forEach(({ key, description, example }) => {
        console.log(`  ${key}:`);
        console.log(`    Description: ${description}`);
        console.log(`    Example: ${example}`);
        console.log('');
      });
    }

    console.log('='.repeat(80) + '\n');

    if (this.errors.length > 0) {
      console.log('❌ Environment validation FAILED');
      console.log('Please set the required environment variables before starting the application.\n');
      console.log('Create a .env file in the project root with the following variables:');
      console.log('');
      this.errors.forEach(({ key, example }) => {
        console.log(`${key}=${example}`);
      });
      console.log('');
    } else {
      console.log('✅ Environment validation PASSED (with warnings)');
      console.log('Consider setting the optional environment variables for full functionality.\n');
    }
  }

  generateEnvExample() {
    const envExamplePath = path.join(__dirname, '../.env.example');
    const lines = [
      '# Astral Field V1 - Environment Variables',
      '# Copy this file to .env and fill in the values',
      '',
      '# ============================================',
      '# REQUIRED VARIABLES',
      '# ============================================',
      ''
    ];

    Object.entries(REQUIRED_VARS).forEach(([key, config]) => {
      lines.push(`# ${config.description}`);
      lines.push(`${key}=${config.example}`);
      lines.push('');
    });

    lines.push('# ============================================');
    lines.push('# OPTIONAL VARIABLES');
    lines.push('# ============================================');
    lines.push('');

    Object.entries(OPTIONAL_VARS).forEach(([key, config]) => {
      lines.push(`# ${config.description}`);
      lines.push(`# ${key}=${config.example}`);
      lines.push('');
    });

    fs.writeFileSync(envExamplePath, lines.join('\n'));
    console.log(`✅ Generated .env.example file at ${envExamplePath}\n`);
  }
}

// Main execution
const validator = new EnvValidator();

// Check if we should generate .env.example
if (process.argv.includes('--generate-example')) {
  validator.generateEnvExample();
  process.exit(0);
}

// Run validation
const isValid = validator.validate();

// Exit with appropriate code
process.exit(isValid ? 0 : 1);
