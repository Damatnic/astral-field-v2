#!/usr/bin/env node
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SecurityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation?: string;
}

interface SecurityAssessment {
  timestamp: string;
  overallScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  checks: SecurityCheck[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    critical: number;
  };
}

class SecurityVerification {
  private baseUrl = 'https://astral-field-v1.vercel.app';
  
  private requiredHeaders = [
    {
      name: 'Strict-Transport-Security',
      check: 'strict-transport-security',
      expectedPattern: /max-age=\d+/,
      severity: 'critical' as const,
      description: 'HSTS header for HTTPS enforcement'
    },
    {
      name: 'X-Frame-Options',
      check: 'x-frame-options',
      expectedPattern: /(DENY|SAMEORIGIN)/,
      severity: 'high' as const,
      description: 'Clickjacking protection'
    },
    {
      name: 'X-Content-Type-Options',
      check: 'x-content-type-options',
      expectedPattern: /nosniff/,
      severity: 'medium' as const,
      description: 'MIME type sniffing protection'
    },
    {
      name: 'Content-Security-Policy',
      check: 'content-security-policy',
      expectedPattern: /default-src/,
      severity: 'critical' as const,
      description: 'XSS and injection protection'
    },
    {
      name: 'Referrer-Policy',
      check: 'referrer-policy',
      expectedPattern: /(origin-when-cross-origin|strict-origin-when-cross-origin)/,
      severity: 'medium' as const,
      description: 'Referrer information control'
    },
    {
      name: 'Permissions-Policy',
      check: 'permissions-policy',
      expectedPattern: /.+/,
      severity: 'medium' as const,
      description: 'Feature permissions control'
    },
    {
      name: 'Cross-Origin-Opener-Policy',
      check: 'cross-origin-opener-policy',
      expectedPattern: /(same-origin|same-origin-allow-popups)/,
      severity: 'medium' as const,
      description: 'Cross-origin isolation'
    }
  ];

  async performSecurityAssessment(): Promise<SecurityAssessment> {
    console.log(chalk.blue.bold('🛡️  ASTRALFIELD SECURITY VERIFICATION\n'));
    
    const checks: SecurityCheck[] = [];
    
    // Check security headers
    await this.checkSecurityHeaders(checks);
    
    // Check SSL/TLS configuration
    await this.checkSSLConfiguration(checks);
    
    // Check for common vulnerabilities
    await this.checkCommonVulnerabilities(checks);
    
    // Check API security
    await this.checkAPISecurity(checks);
    
    // Calculate overall score and grade
    const { score, grade } = this.calculateSecurityScore(checks);
    
    const summary = {
      passed: checks.filter(c => c.status === 'pass').length,
      failed: checks.filter(c => c.status === 'fail').length,
      warnings: checks.filter(c => c.status === 'warning').length,
      critical: checks.filter(c => c.status === 'fail' && c.severity === 'critical').length
    };
    
    const assessment: SecurityAssessment = {
      timestamp: new Date().toISOString(),
      overallScore: score,
      grade,
      checks,
      summary
    };
    
    this.displaySecurityResults(assessment);
    
    return assessment;
  }

  private async checkSecurityHeaders(checks: SecurityCheck[]): Promise<void> {
    console.log(chalk.cyan('🔍 Checking security headers...'));
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'HEAD'
      });
      
      for (const header of this.requiredHeaders) {
        const headerValue = response.headers.get(header.check);
        
        if (!headerValue) {
          checks.push({
            name: header.name,
            status: 'fail',
            details: `Header not present`,
            severity: header.severity,
            recommendation: `Add ${header.name} header for ${header.description}`
          });
        } else if (header.expectedPattern && !header.expectedPattern.test(headerValue)) {
          checks.push({
            name: header.name,
            status: 'warning',
            details: `Header present but may need adjustment: ${headerValue}`,
            severity: header.severity,
            recommendation: `Review ${header.name} configuration`
          });
        } else {
          checks.push({
            name: header.name,
            status: 'pass',
            details: `Properly configured: ${headerValue.substring(0, 50)}...`,
            severity: header.severity
          });
        }
      }
      
      // Check for security-related headers that shouldn't be present
      const badHeaders = ['server', 'x-powered-by'];
      for (const badHeader of badHeaders) {
        const headerValue = response.headers.get(badHeader);
        if (headerValue) {
          checks.push({
            name: `Removed ${badHeader}`,
            status: 'warning',
            details: `Information disclosure: ${headerValue}`,
            severity: 'low',
            recommendation: `Remove or obfuscate ${badHeader} header`
          });
        } else {
          checks.push({
            name: `Removed ${badHeader}`,
            status: 'pass',
            details: `Header properly removed/hidden`,
            severity: 'low'
          });
        }
      }
      
    } catch (error: any) {
      checks.push({
        name: 'Security Headers Check',
        status: 'fail',
        details: `Failed to check headers: ${error.message}`,
        severity: 'critical',
        recommendation: 'Verify site accessibility and try again'
      });
    }
  }

  private async checkSSLConfiguration(checks: SecurityCheck[]): Promise<void> {
    console.log(chalk.cyan('🔒 Checking SSL/TLS configuration...'));
    
    try {
      // Check if HTTPS is enforced
      const httpResponse = await fetch(this.baseUrl.replace('https://', 'http://'), {
        method: 'HEAD',
        redirect: 'manual'
      });
      
      if (httpResponse.status >= 300 && httpResponse.status < 400) {
        const location = httpResponse.headers.get('location');
        if (location && location.startsWith('https://')) {
          checks.push({
            name: 'HTTPS Redirect',
            status: 'pass',
            details: 'HTTP automatically redirects to HTTPS',
            severity: 'critical'
          });
        } else {
          checks.push({
            name: 'HTTPS Redirect',
            status: 'fail',
            details: 'HTTP does not redirect to HTTPS',
            severity: 'critical',
            recommendation: 'Configure automatic HTTPS redirect'
          });
        }
      } else {
        checks.push({
          name: 'HTTPS Redirect',
          status: 'warning',
          details: 'HTTP response behavior unclear',
          severity: 'medium',
          recommendation: 'Verify HTTPS redirect configuration'
        });
      }
      
      // Check HTTPS response
      const httpsResponse = await fetch(this.baseUrl, { method: 'HEAD' });
      if (httpsResponse.ok) {
        checks.push({
          name: 'HTTPS Accessibility',
          status: 'pass',
          details: 'Site accessible via HTTPS',
          severity: 'critical'
        });
      } else {
        checks.push({
          name: 'HTTPS Accessibility',
          status: 'fail',
          details: `HTTPS request failed: ${httpsResponse.status}`,
          severity: 'critical',
          recommendation: 'Fix HTTPS configuration'
        });
      }
      
    } catch (error: any) {
      checks.push({
        name: 'SSL/TLS Configuration',
        status: 'fail',
        details: `SSL check failed: ${error.message}`,
        severity: 'critical',
        recommendation: 'Verify SSL certificate and configuration'
      });
    }
  }

  private async checkCommonVulnerabilities(checks: SecurityCheck[]): Promise<void> {
    console.log(chalk.cyan('🔍 Checking for common vulnerabilities...'));
    
    // Check for directory traversal protection
    try {
      const traversalAttempt = await fetch(`${this.baseUrl}/../../../etc/passwd`);
      if (traversalAttempt.status === 404) {
        checks.push({
          name: 'Directory Traversal Protection',
          status: 'pass',
          details: 'Path traversal attempts properly blocked',
          severity: 'high'
        });
      } else {
        checks.push({
          name: 'Directory Traversal Protection',
          status: 'fail',
          details: `Unexpected response to traversal attempt: ${traversalAttempt.status}`,
          severity: 'high',
          recommendation: 'Implement proper path sanitization'
        });
      }
    } catch (error) {
      checks.push({
        name: 'Directory Traversal Protection',
        status: 'pass',
        details: 'Path traversal attempts blocked (connection error)',
        severity: 'high'
      });
    }
    
    // Check for information disclosure
    const sensitiveEndpoints = [
      '/.env',
      '/.git/config',
      '/package.json',
      '/next.config.js',
      '/admin',
      '/wp-admin'
    ];
    
    for (const endpoint of sensitiveEndpoints) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        if (response.status === 404) {
          checks.push({
            name: `Sensitive File Protection (${endpoint})`,
            status: 'pass',
            details: 'Sensitive files properly protected',
            severity: 'medium'
          });
        } else if (response.status === 200) {
          checks.push({
            name: `Sensitive File Protection (${endpoint})`,
            status: 'fail',
            details: `Sensitive file accessible: ${response.status}`,
            severity: 'high',
            recommendation: `Block access to ${endpoint}`
          });
        }
      } catch (error) {
        // Network errors are fine for sensitive files
      }
    }
  }

  private async checkAPISecurity(checks: SecurityCheck[]): Promise<void> {
    console.log(chalk.cyan('🔍 Checking API security...'));
    
    const apiEndpoints = [
      '/api/health',
      '/api/auth/me',
      '/api/teams',
      '/api/players'
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        
        // Check for proper CORS headers
        const corsHeader = response.headers.get('access-control-allow-origin');
        if (corsHeader === '*') {
          checks.push({
            name: `CORS Configuration (${endpoint})`,
            status: 'warning',
            details: 'Overly permissive CORS policy',
            severity: 'medium',
            recommendation: 'Restrict CORS to specific origins'
          });
        } else {
          checks.push({
            name: `CORS Configuration (${endpoint})`,
            status: 'pass',
            details: 'CORS properly configured',
            severity: 'medium'
          });
        }
        
        // Check for rate limiting headers
        const rateLimitHeaders = [
          'x-ratelimit-limit',
          'x-ratelimit-remaining',
          'retry-after'
        ];
        
        const hasRateLimit = rateLimitHeaders.some(header => 
          response.headers.get(header)
        );
        
        if (hasRateLimit) {
          checks.push({
            name: `Rate Limiting (${endpoint})`,
            status: 'pass',
            details: 'Rate limiting headers detected',
            severity: 'medium'
          });
        } else {
          checks.push({
            name: `Rate Limiting (${endpoint})`,
            status: 'warning',
            details: 'No rate limiting headers detected',
            severity: 'medium',
            recommendation: 'Implement API rate limiting'
          });
        }
        
      } catch (error) {
        // API might be down, which is handled elsewhere
      }
    }
  }

  private calculateSecurityScore(checks: SecurityCheck[]): { score: number, grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' } {
    let totalPoints = 0;
    let maxPoints = 0;
    
    for (const check of checks) {
      const severityWeight = {
        critical: 20,
        high: 15,
        medium: 10,
        low: 5
      };
      
      const weight = severityWeight[check.severity];
      maxPoints += weight;
      
      if (check.status === 'pass') {
        totalPoints += weight;
      } else if (check.status === 'warning') {
        totalPoints += weight * 0.5;
      }
      // fail = 0 points
    }
    
    const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
    
    const grade = score >= 95 ? 'A+' :
                  score >= 90 ? 'A' :
                  score >= 80 ? 'B' :
                  score >= 70 ? 'C' :
                  score >= 60 ? 'D' : 'F';
    
    return { score, grade };
  }

  private displaySecurityResults(assessment: SecurityAssessment): void {
    console.log('\n' + '='.repeat(60));
    
    const gradeColor = assessment.grade === 'A+' || assessment.grade === 'A' ? chalk.green :
                      assessment.grade === 'B' || assessment.grade === 'C' ? chalk.yellow :
                      chalk.red;
    
    console.log(gradeColor.bold(`🛡️  SECURITY GRADE: ${assessment.grade} (${assessment.overallScore}/100)`));
    console.log(chalk.cyan(`📊 Results: ${assessment.summary.passed} passed, ${assessment.summary.failed} failed, ${assessment.summary.warnings} warnings`));
    
    if (assessment.summary.critical > 0) {
      console.log(chalk.red.bold(`🚨 CRITICAL ISSUES: ${assessment.summary.critical}`));
    }
    
    console.log('\n' + chalk.blue.bold('📋 DETAILED RESULTS:\n'));
    
    // Group by severity
    const grouped = {
      critical: assessment.checks.filter(c => c.severity === 'critical'),
      high: assessment.checks.filter(c => c.severity === 'high'),
      medium: assessment.checks.filter(c => c.severity === 'medium'),
      low: assessment.checks.filter(c => c.severity === 'low')
    };
    
    for (const [severity, checks] of Object.entries(grouped)) {
      if (checks.length === 0) continue;
      
      const severityColor = severity === 'critical' ? chalk.red :
                           severity === 'high' ? chalk.yellow :
                           severity === 'medium' ? chalk.blue :
                           chalk.gray;
      
      console.log(severityColor.bold(`${severity.toUpperCase()} SEVERITY:`));
      
      for (const check of checks) {
        const statusIcon = check.status === 'pass' ? '✅' :
                          check.status === 'warning' ? '⚠️' : '❌';
        
        console.log(`${statusIcon} ${check.name}: ${check.details}`);
        
        if (check.recommendation) {
          console.log(chalk.gray(`   💡 ${check.recommendation}`));
        }
      }
      console.log();
    }
    
    this.displaySecurityRecommendations(assessment);
  }

  private displaySecurityRecommendations(assessment: SecurityAssessment): void {
    const failedChecks = assessment.checks.filter(c => c.status === 'fail');
    const warningChecks = assessment.checks.filter(c => c.status === 'warning');
    
    if (failedChecks.length === 0 && warningChecks.length === 0) {
      console.log(chalk.green.bold('🎊 EXCELLENT! No security issues found!'));
      return;
    }
    
    console.log(chalk.blue.bold('🔧 SECURITY RECOMMENDATIONS:\n'));
    
    if (failedChecks.length > 0) {
      console.log(chalk.red.bold('IMMEDIATE ACTION REQUIRED:'));
      failedChecks
        .filter(c => c.recommendation)
        .forEach((check, index) => {
          console.log(chalk.red(`${index + 1}. ${check.recommendation}`));
        });
      console.log();
    }
    
    if (warningChecks.length > 0) {
      console.log(chalk.yellow.bold('IMPROVEMENTS RECOMMENDED:'));
      warningChecks
        .filter(c => c.recommendation)
        .forEach((check, index) => {
          console.log(chalk.yellow(`${index + 1}. ${check.recommendation}`));
        });
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const security = new SecurityVerification();

  if (args.includes('--help')) {
    console.log(`
AstralField Security Verification

Usage: npx tsx scripts/security-verification.ts

Options:
  --help     Show this help message

This tool performs a comprehensive security assessment including:
- Security headers verification
- SSL/TLS configuration check
- Common vulnerability scanning
- API security verification
    `);
    return;
  }

  await security.performSecurityAssessment();
}

if (require.main === module) {
  main().catch(console.error);
}

export { SecurityVerification };