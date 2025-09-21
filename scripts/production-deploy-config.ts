#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import prompts from 'prompts';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';

const execAsync = promisify(exec);

// Production deployment configuration generator
class ProductionDeployConfig {
  private configs = {
    vercel: {
      name: 'Vercel',
      files: ['vercel.json', '.vercelignore'],
      envPrefix: 'NEXT_PUBLIC_',
      buildCommand: 'npm run build',
      outputDirectory: '.next'
    },
    netlify: {
      name: 'Netlify',
      files: ['netlify.toml', '_redirects', '_headers'],
      envPrefix: 'REACT_APP_',
      buildCommand: 'npm run build',
      outputDirectory: 'out'
    },
    railway: {
      name: 'Railway',
      files: ['railway.json', 'railway.toml'],
      envPrefix: '',
      buildCommand: 'npm run build',
      outputDirectory: '.next'
    },
    heroku: {
      name: 'Heroku',
      files: ['Procfile', 'app.json'],
      envPrefix: '',
      buildCommand: 'npm run build',
      outputDirectory: '.next'
    }
  };

  async setup(): Promise<void> {
    console.log(chalk.blue.bold('\n🚀 PRODUCTION DEPLOYMENT CONFIGURATOR\n'));

    // Check current environment
    const checks = await this.performHealthChecks();
    this.displayHealthChecks(checks);

    if (!checks.allPassed) {
      const { proceed } = await prompts({
        type: 'confirm',
        name: 'proceed',
        message: 'Some checks failed. Continue anyway?',
        initial: false
      });
      
      if (!proceed) {
        process.exit(0);
      }
    }

    // Select deployment platform
    const { platform } = await prompts({
      type: 'select',
      name: 'platform',
      message: 'Select deployment platform:',
      choices: Object.keys(this.configs).map(key => ({
        title: this.configs[key as keyof typeof this.configs].name,
        value: key
      }))
    });

    // Configure deployment
    await this.configureDeployment(platform);
  }

  private async performHealthChecks(): Promise<any> {
    const checks = {
      gitRepo: false,
      gitClean: false,
      nodeVersion: '',
      npmVersion: '',
      buildPasses: false,
      envFileExists: false,
      testsPass: false,
      allPassed: false
    };

    // Check git
    try {
      await execAsync('git status');
      checks.gitRepo = true;
      const { stdout } = await execAsync('git status --porcelain');
      checks.gitClean = stdout.trim().length === 0;
    } catch {}

    // Check Node/NPM
    try {
      const { stdout: nodeVersion } = await execAsync('node --version');
      checks.nodeVersion = nodeVersion.trim();
      const { stdout: npmVersion } = await execAsync('npm --version');
      checks.npmVersion = npmVersion.trim();
    } catch {}

    // Check env file
    try {
      await fs.access('.env.local');
      checks.envFileExists = true;
    } catch {}

    // Check if all critical checks pass
    checks.allPassed = checks.gitRepo && checks.nodeVersion !== '';

    return checks;
  }

  private displayHealthChecks(checks: any): void {
    console.log(chalk.white('Pre-deployment Checks:\n'));
    
    console.log(checks.gitRepo ? chalk.green('✅') : chalk.red('❌'), 'Git repository');
    console.log(checks.gitClean ? chalk.green('✅') : chalk.yellow('⚠️ '), 'Git working tree clean');
    console.log(checks.nodeVersion ? chalk.green('✅') : chalk.red('❌'), `Node.js ${checks.nodeVersion}`);
    console.log(checks.npmVersion ? chalk.green('✅') : chalk.red('❌'), `NPM ${checks.npmVersion}`);
    console.log(checks.envFileExists ? chalk.green('✅') : chalk.yellow('⚠️ '), 'Environment file exists');
    
    console.log();
  }

  private async configureDeployment(platform: string): Promise<void> {
    const config = this.configs[platform as keyof typeof this.configs];
    
    console.log(chalk.blue(`\nConfiguring ${config.name} deployment...\n`));

    // Create deployment files based on platform
    switch (platform) {
      case 'vercel':
        await this.createVercelConfig();
        break;
      case 'netlify':
        await this.createNetlifyConfig();
        break;
      case 'railway':
        await this.createRailwayConfig();
        break;
      case 'heroku':
        await this.createHerokuConfig();
        break;
    }

    // Create environment configuration
    await this.createEnvConfig(platform);

    // Create deployment scripts
    await this.createDeploymentScripts(platform);

    // Create monitoring configuration
    await this.createMonitoringConfig();

    // Display next steps
    this.displayNextSteps(platform);
  }

  private async createVercelConfig(): Promise<void> {
    const vercelConfig = {
      "$schema": "https://openapi.vercel.sh/vercel.json",
      "framework": "nextjs",
      "buildCommand": "npm run build",
      "devCommand": "npm run dev",
      "installCommand": "npm install",
      "regions": ["iad1"],
      "functions": {
        "src/app/api/**/*.ts": {
          "maxDuration": 10
        }
      },
      "crons": [
        {
          "path": "/api/cron/cleanup",
          "schedule": "0 0 * * *"
        }
      ],
      "headers": [
        {
          "source": "/api/(.*)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "s-maxage=60, stale-while-revalidate"
            }
          ]
        }
      ],
      "rewrites": [
        {
          "source": "/api/:path*",
          "destination": "/api/:path*"
        }
      ],
      "env": {
        "DATABASE_URL": "@database-url",
        "NEXTAUTH_URL": "@nextauth-url",
        "NEXTAUTH_SECRET": "@nextauth-secret"
      }
    };

    await fs.writeFile('vercel.json', JSON.stringify(vercelConfig, null, 2), 'utf-8');
    
    const vercelIgnore = `
# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage
.nyc_output

# Next.js
.next
out

# Production
build
dist

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
`;

    await fs.writeFile('.vercelignore', vercelIgnore.trim(), 'utf-8');
    
    console.log(chalk.green('✅ Created vercel.json and .vercelignore'));
  }

  private async createNetlifyConfig(): Promise<void> {
    const netlifyToml = `
[build]
  command = "npm run build"
  publish = "out"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[functions]
  node_bundler = "esbuild"
  included_files = ["src/**"]
`;

    await fs.writeFile('netlify.toml', netlifyToml.trim(), 'utf-8');
    console.log(chalk.green('✅ Created netlify.toml'));
  }

  private async createRailwayConfig(): Promise<void> {
    const railwayJson = {
      "$schema": "https://railway.app/railway.schema.json",
      "build": {
        "builder": "nixpacks",
        "buildCommand": "npm run build"
      },
      "deploy": {
        "startCommand": "npm start",
        "restartPolicyType": "on-failure",
        "restartPolicyMaxRetries": 10,
        "healthcheckPath": "/api/health",
        "healthcheckTimeout": 30
      },
      "environments": {
        "production": {
          "build": {
            "buildCommand": "npm run build:production"
          }
        }
      }
    };

    await fs.writeFile('railway.json', JSON.stringify(railwayJson, null, 2), 'utf-8');
    console.log(chalk.green('✅ Created railway.json'));
  }

  private async createHerokuConfig(): Promise<void> {
    const procfile = `
web: npm start
worker: npm run worker
release: npm run migrate
`;

    const appJson = {
      "name": "Fantasy Football Platform",
      "description": "Production-ready fantasy football application",
      "repository": "https://github.com/yourusername/fantasy-football",
      "keywords": ["fantasy", "football", "nextjs", "typescript"],
      "buildpacks": [
        {
          "url": "heroku/nodejs"
        }
      ],
      "formation": {
        "web": {
          "quantity": 1,
          "size": "standard-1x"
        },
        "worker": {
          "quantity": 1,
          "size": "standard-1x"
        }
      },
      "addons": [
        {
          "plan": "heroku-postgresql:standard-0"
        },
        {
          "plan": "heroku-redis:premium-0"
        },
        {
          "plan": "papertrail:choklad"
        }
      ],
      "env": {
        "NODE_ENV": {
          "value": "production"
        },
        "NPM_CONFIG_PRODUCTION": {
          "value": "false"
        }
      },
      "scripts": {
        "postdeploy": "npm run seed:production"
      }
    };

    await fs.writeFile('Procfile', procfile.trim(), 'utf-8');
    await fs.writeFile('app.json', JSON.stringify(appJson, null, 2), 'utf-8');
    console.log(chalk.green('✅ Created Procfile and app.json'));
  }

  private async createEnvConfig(platform: string): Promise<void> {
    const envExample = `
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fantasy_football

# Authentication
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# External APIs
SLEEPER_API_URL=https://api.sleeper.app/v1
ESPN_API_URL=https://fantasy.espn.com/apis/v3

# Redis
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEW_RELIC_LICENSE_KEY=your-license-key

# Feature Flags
ENABLE_REAL_TIME=true
ENABLE_ANALYTICS=true
ENABLE_PREMIUM_FEATURES=false

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
API_KEY=your-api-key

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key

# Storage
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Performance
NODE_OPTIONS=--max-old-space-size=4096
`;

    await fs.writeFile('.env.production.example', envExample.trim(), 'utf-8');
    console.log(chalk.green('✅ Created .env.production.example'));
  }

  private async createDeploymentScripts(platform: string): Promise<void> {
    const deployScript = `#!/bin/bash
set -e

echo "🚀 Deploying to ${platform}..."

# Run pre-deployment checks
npm run lint
npm run type-check
npm run test:ci

# Build application
npm run build

# Run database migrations
npm run migrate:production

# Deploy based on platform
case "${platform}" in
  vercel)
    vercel --prod
    ;;
  netlify)
    netlify deploy --prod
    ;;
  railway)
    railway up
    ;;
  heroku)
    git push heroku main
    ;;
esac

echo "✅ Deployment complete!"
`;

    const rollbackScript = `#!/bin/bash
set -e

echo "🔄 Rolling back deployment..."

case "${platform}" in
  vercel)
    vercel rollback
    ;;
  netlify)
    netlify rollback
    ;;
  railway)
    railway rollback
    ;;
  heroku)
    heroku rollback
    ;;
esac

echo "✅ Rollback complete!"
`;

    await fs.writeFile(`deploy-${platform}.sh`, deployScript, 'utf-8');
    await fs.writeFile(`rollback-${platform}.sh`, rollbackScript, 'utf-8');
    
    await execAsync(`chmod +x deploy-${platform}.sh`);
    await execAsync(`chmod +x rollback-${platform}.sh`);
    
    console.log(chalk.green(`✅ Created deployment scripts for ${platform}`));
  }

  private async createMonitoringConfig(): Promise<void> {
    const monitoringConfig = {
      "monitoring": {
        "uptime": {
          "enabled": true,
          "interval": 300,
          "endpoints": [
            "/",
            "/api/health",
            "/api/matchups"
          ]
        },
        "performance": {
          "enabled": true,
          "sampleRate": 0.1,
          "metrics": [
            "FCP",
            "LCP",
            "FID",
            "CLS",
            "TTFB"
          ]
        },
        "errors": {
          "enabled": true,
          "captureUnhandled": true,
          "ignorePatterns": [
            "ResizeObserver",
            "Non-Error promise rejection"
          ]
        },
        "alerts": {
          "errorRate": {
            "threshold": 0.01,
            "window": 300
          },
          "responseTime": {
            "threshold": 3000,
            "window": 300
          },
          "uptime": {
            "threshold": 0.99
          }
        }
      }
    };

    await fs.writeFile('monitoring.json', JSON.stringify(monitoringConfig, null, 2), 'utf-8');
    console.log(chalk.green('✅ Created monitoring.json'));
  }

  private displayNextSteps(platform: string): void {
    console.log(chalk.blue.bold('\n✅ DEPLOYMENT CONFIGURATION COMPLETE\n'));
    
    console.log(chalk.white('Next Steps:\n'));
    console.log(chalk.white(`1. Review and update .env.production.example`));
    console.log(chalk.white(`2. Set up environment variables in ${platform}`));
    console.log(chalk.white(`3. Connect your repository to ${platform}`));
    console.log(chalk.white(`4. Run deployment: ./deploy-${platform}.sh`));
    console.log(chalk.white(`5. Monitor deployment in ${platform} dashboard`));
    
    console.log(chalk.yellow('\n⚠️  Important Security Notes:'));
    console.log(chalk.white('• Never commit .env files with real credentials'));
    console.log(chalk.white('• Use secrets management in production'));
    console.log(chalk.white('• Enable 2FA on deployment platform'));
    console.log(chalk.white('• Set up proper CORS and CSP headers'));
    console.log(chalk.white('• Configure rate limiting and DDoS protection'));
  }
}

// Main execution
async function main() {
  const deployer = new ProductionDeployConfig();
  
  try {
    await deployer.setup();
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ProductionDeployConfig };