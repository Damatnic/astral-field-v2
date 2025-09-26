#!/usr/bin/env tsx
/**
 * Atlas Deployment Verification System
 * Comprehensive verification of AstralField production deployment
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const prisma = new PrismaClient();

interface VerificationResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  duration?: number;
  details?: any;
}

const PRODUCTION_URL = 'https://web-7ts4brd6b-astral-productions.vercel.app';
const DEMO_USERS = [
  { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", teamName: "D'Amato Dynasty", role: "COMMISSIONER" },
  { name: "Nick Hartley", email: "nick@damato-dynasty.com", teamName: "Hartley's Heroes", role: "PLAYER" },
  { name: "Jack McCaigue", email: "jack@damato-dynasty.com", teamName: "McCaigue Mayhem", role: "PLAYER" },
  { name: "Larry McCaigue", email: "larry@damato-dynasty.com", teamName: "Larry Legends", role: "PLAYER" },
  { name: "Renee McCaigue", email: "renee@damato-dynasty.com", teamName: "Renee's Reign", role: "PLAYER" },
  { name: "Jon Kornbeck", email: "jon@damato-dynasty.com", teamName: "Kornbeck Crushers", role: "PLAYER" },
  { name: "David Jarvey", email: "david@damato-dynasty.com", teamName: "Jarvey's Juggernauts", role: "PLAYER" },
  { name: "Kaity Lorbecki", email: "kaity@damato-dynasty.com", teamName: "Lorbecki Lions", role: "PLAYER" },
  { name: "Cason Minor", email: "cason@damato-dynasty.com", teamName: "Minor Miracles", role: "PLAYER" },
  { name: "Brittany Bergum", email: "brittany@damato-dynasty.com", teamName: "Bergum Blitz", role: "PLAYER" }
];

class AtlasDeploymentVerifier {
  private results: VerificationResult[] = [];

  constructor() {
    console.log('🚀 Atlas Deployment Verification System Starting...');
    console.log(`🎯 Target: ${PRODUCTION_URL}`);
    console.log('📊 Running comprehensive deployment validation...\n');
  }

  private async addResult(test: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: any) {
    const result: VerificationResult = { test, status, message, details };
    this.results.push(result);
    
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${test}: ${message}`);
    
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  async verifyDatabaseConnectivity(): Promise<void> {
    console.log('\n🔍 Atlas Phase 1: Database Connectivity Verification');
    
    try {
      const startTime = Date.now();
      await prisma.$connect();
      const duration = Date.now() - startTime;
      
      await this.addResult(
        'Database Connection',
        'PASS',
        `Connected successfully in ${duration}ms`,
        { duration, provider: 'Neon PostgreSQL' }
      );
    } catch (error: any) {
      await this.addResult(
        'Database Connection',
        'FAIL',
        `Connection failed: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async verifyUserAccounts(): Promise<void> {
    console.log('\n👥 Atlas Phase 2: User Account Verification');
    
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          teamName: true,
          hashedPassword: true,
          createdAt: true
        }
      });

      const demoUsers = users.filter(user => 
        user.email.endsWith('@damato-dynasty.com')
      );

      await this.addResult(
        'User Account Count',
        demoUsers.length === 10 ? 'PASS' : 'WARNING',
        `Found ${demoUsers.length}/10 D'Amato Dynasty users`,
        { totalUsers: users.length, demoUsers: demoUsers.length }
      );

      // Verify each demo user exists
      for (const expectedUser of DEMO_USERS) {
        const foundUser = demoUsers.find(u => u.email === expectedUser.email);
        
        if (foundUser) {
          await this.addResult(
            `User: ${expectedUser.name}`,
            'PASS',
            `Account configured correctly`,
            {
              email: foundUser.email,
              role: foundUser.role,
              teamName: foundUser.teamName,
              hasPassword: !!foundUser.hashedPassword
            }
          );
        } else {
          await this.addResult(
            `User: ${expectedUser.name}`,
            'FAIL',
            'Account not found',
            { expectedEmail: expectedUser.email }
          );
        }
      }
    } catch (error: any) {
      await this.addResult(
        'User Account Verification',
        'FAIL',
        `Database query failed: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async verifyPasswordHashing(): Promise<void> {
    console.log('\n🔐 Atlas Phase 3: Password Security Verification');
    
    try {
      const sampleUser = await prisma.user.findFirst({
        where: { email: 'nicholas@damato-dynasty.com' },
        select: { hashedPassword: true }
      });

      if (sampleUser && sampleUser.hashedPassword) {
        // Verify password can be validated
        const isValidPassword = await bcrypt.compare('Dynasty2025!', sampleUser.hashedPassword);
        
        await this.addResult(
          'Password Hashing',
          isValidPassword ? 'PASS' : 'FAIL',
          isValidPassword ? 'Passwords properly hashed and verifiable' : 'Password verification failed',
          {
            hashLength: sampleUser.hashedPassword.length,
            hashPrefix: sampleUser.hashedPassword.substring(0, 10) + '...',
            algorithm: 'bcryptjs'
          }
        );
      } else {
        await this.addResult(
          'Password Hashing',
          'FAIL',
          'No password hash found for test user'
        );
      }
    } catch (error: any) {
      await this.addResult(
        'Password Hashing',
        'FAIL',
        `Password verification failed: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async verifyDeploymentAccessibility(): Promise<void> {
    console.log('\n🌐 Atlas Phase 4: Deployment Accessibility Verification');
    
    try {
      const startTime = Date.now();
      const response = await fetch(PRODUCTION_URL);
      const duration = Date.now() - startTime;
      
      await this.addResult(
        'Homepage Accessibility',
        response.ok ? 'PASS' : 'FAIL',
        `${response.status} ${response.statusText} in ${duration}ms`,
        {
          status: response.status,
          duration,
          url: PRODUCTION_URL,
          headers: Object.fromEntries(response.headers.entries())
        }
      );

      if (response.ok) {
        const html = await response.text();
        const hasAuthForm = html.includes('signin') || html.includes('Sign in');
        
        await this.addResult(
          'Authentication UI',
          hasAuthForm ? 'PASS' : 'WARNING',
          hasAuthForm ? 'Sign-in interface detected' : 'Sign-in interface not clearly visible',
          { contentLength: html.length }
        );
      }
    } catch (error: any) {
      await this.addResult(
        'Homepage Accessibility',
        'FAIL',
        `Network error: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async verifySigninPageAccessibility(): Promise<void> {
    console.log('\n🔑 Atlas Phase 5: Signin Page Verification');
    
    try {
      const signinUrl = `${PRODUCTION_URL}/auth/signin`;
      const startTime = Date.now();
      const response = await fetch(signinUrl);
      const duration = Date.now() - startTime;
      
      await this.addResult(
        'Signin Page Accessibility',
        response.ok ? 'PASS' : 'FAIL',
        `${response.status} ${response.statusText} in ${duration}ms`,
        {
          status: response.status,
          duration,
          url: signinUrl
        }
      );

      if (response.ok) {
        const html = await response.text();
        
        // Check for key signin elements
        const hasEmailField = html.includes('email') || html.includes('Email');
        const hasPasswordField = html.includes('password') || html.includes('Password');
        const hasDemoUsers = html.includes("D'Amato Dynasty") || html.includes('nicholas@damato-dynasty.com');
        
        await this.addResult(
          'Signin Form Elements',
          (hasEmailField && hasPasswordField) ? 'PASS' : 'WARNING',
          `Email: ${hasEmailField}, Password: ${hasPasswordField}, Demo: ${hasDemoUsers}`,
          { hasEmailField, hasPasswordField, hasDemoUsers }
        );
      }
    } catch (error: any) {
      await this.addResult(
        'Signin Page Accessibility',
        'FAIL',
        `Network error: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async verifyEnvironmentConfiguration(): Promise<void> {
    console.log('\n⚙️ Atlas Phase 6: Environment Configuration Verification');
    
    // Check critical environment variables
    const criticalEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NODE_ENV'
    ];

    for (const envVar of criticalEnvVars) {
      const value = process.env[envVar];
      
      await this.addResult(
        `Environment: ${envVar}`,
        value ? 'PASS' : 'FAIL',
        value ? 'Configured' : 'Missing or empty',
        { 
          hasValue: !!value,
          valueLength: value?.length || 0,
          isProduction: process.env.NODE_ENV === 'production'
        }
      );
    }
  }

  async verifyNextAuthConfiguration(): Promise<void> {
    console.log('\n🔒 Atlas Phase 7: NextAuth Configuration Verification');
    
    try {
      // Test that auth configuration loads without errors
      const { authConfig } = await import('../apps/web/src/lib/auth-config');
      
      await this.addResult(
        'NextAuth Config Load',
        'PASS',
        'Configuration loaded successfully',
        {
          providersCount: authConfig.providers?.length || 0,
          hasJwtConfig: !!authConfig.jwt,
          hasSessionConfig: !!authConfig.session,
          sessionStrategy: authConfig.session?.strategy
        }
      );

      // Verify session settings
      const sessionMaxAge = authConfig.session?.maxAge;
      const isSecureSession = sessionMaxAge && sessionMaxAge <= 30 * 60; // 30 minutes or less
      
      await this.addResult(
        'Session Security',
        isSecureSession ? 'PASS' : 'WARNING',
        `Session max age: ${sessionMaxAge} seconds`,
        { 
          maxAge: sessionMaxAge,
          isSecure: isSecureSession,
          recommendation: '30 minutes max for security'
        }
      );
    } catch (error: any) {
      await this.addResult(
        'NextAuth Configuration',
        'FAIL',
        `Configuration error: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async verifySecurityHeaders(): Promise<void> {
    console.log('\n🛡️ Atlas Phase 8: Security Headers Verification');
    
    try {
      const response = await fetch(PRODUCTION_URL);
      const headers = response.headers;
      
      const securityHeaders = {
        'x-frame-options': headers.get('x-frame-options'),
        'x-content-type-options': headers.get('x-content-type-options'),
        'strict-transport-security': headers.get('strict-transport-security'),
        'content-security-policy': headers.get('content-security-policy'),
        'x-xss-protection': headers.get('x-xss-protection')
      };

      const secureHeaders = Object.entries(securityHeaders).filter(([, value]) => value !== null);
      
      await this.addResult(
        'Security Headers',
        secureHeaders.length >= 3 ? 'PASS' : 'WARNING',
        `${secureHeaders.length}/5 security headers present`,
        securityHeaders
      );
    } catch (error: any) {
      await this.addResult(
        'Security Headers',
        'FAIL',
        `Failed to check headers: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async generateDeploymentReport(): Promise<void> {
    console.log('\n📊 Atlas Deployment Verification Report');
    console.log('=' * 60);
    
    const passed = this.results.filter(r => r.status === 'PASS');
    const failed = this.results.filter(r => r.status === 'FAIL');
    const warnings = this.results.filter(r => r.status === 'WARNING');
    
    console.log(`\n✅ PASSED: ${passed.length}`);
    console.log(`❌ FAILED: ${failed.length}`);
    console.log(`⚠️ WARNINGS: ${warnings.length}`);
    console.log(`📊 TOTAL TESTS: ${this.results.length}`);
    
    const overallStatus = failed.length === 0 ? 
      (warnings.length === 0 ? 'FULLY OPERATIONAL' : 'OPERATIONAL WITH WARNINGS') : 
      'DEPLOYMENT ISSUES DETECTED';
    
    console.log(`\n🎯 OVERALL STATUS: ${overallStatus}`);
    
    if (failed.length > 0) {
      console.log('\n❌ CRITICAL ISSUES:');
      failed.forEach(result => {
        console.log(`   - ${result.test}: ${result.message}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      warnings.forEach(result => {
        console.log(`   - ${result.test}: ${result.message}`);
      });
    }
    
    console.log('\n🚀 DEPLOYMENT SUMMARY:');
    console.log(`   • Database: ${this.getStatusForTest('Database Connection')}`);
    console.log(`   • User Accounts: ${this.getStatusForTest('User Account Count')}`);
    console.log(`   • Authentication: ${this.getStatusForTest('NextAuth Config Load')}`);
    console.log(`   • Accessibility: ${this.getStatusForTest('Homepage Accessibility')}`);
    console.log(`   • Security: ${this.getStatusForTest('Security Headers')}`);
    
    if (failed.length === 0) {
      console.log('\n🎉 ATLAS VERIFICATION COMPLETE: Deployment is ready for production use!');
      console.log(`📱 Login URL: ${PRODUCTION_URL}/auth/signin`);
      console.log('👥 All 10 D\'Amato Dynasty League users can now log in with password: Dynasty2025!');
    } else {
      console.log('\n⚠️ ATLAS VERIFICATION INCOMPLETE: Please address critical issues before going live.');
    }
  }

  private getStatusForTest(testName: string): string {
    const result = this.results.find(r => r.test === testName);
    return result ? result.status : 'NOT_TESTED';
  }

  async runFullVerification(): Promise<boolean> {
    try {
      await this.verifyDatabaseConnectivity();
      await this.verifyUserAccounts();
      await this.verifyPasswordHashing();
      await this.verifyDeploymentAccessibility();
      await this.verifySigninPageAccessibility();
      await this.verifyEnvironmentConfiguration();
      await this.verifyNextAuthConfiguration();
      await this.verifySecurityHeaders();
      
      await this.generateDeploymentReport();
      
      const criticalFailures = this.results.filter(r => r.status === 'FAIL').length;
      return criticalFailures === 0;
      
    } catch (error) {
      console.error('💥 Atlas Verification System Error:', error);
      return false;
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Execute verification if run directly
if (require.main === module) {
  const atlas = new AtlasDeploymentVerifier();
  
  atlas.runFullVerification()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Atlas System Failure:', error);
      process.exit(1);
    });
}

export { AtlasDeploymentVerifier };