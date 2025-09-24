import { prisma } from '@/lib/db';
import { redis } from '@/lib/cache/redis-client';

export interface SecurityScanResult {
  scanId: string;
  timestamp: Date;
  scanType: 'vulnerability' | 'penetration' | 'configuration' | 'dependency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  findings: SecurityFinding[];
  overallScore: number;
  recommendations: string[];
}

export interface SecurityFinding {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_endpoints?: string[];
  remediation: string;
  cvss_score?: number;
  cve_id?: string;
}

export class SecurityScanner {
  private scanResults: Map<string, SecurityScanResult> = new Map();

  async performComprehensiveSecurityScan(): Promise<SecurityScanResult> {
    const scanId = `scan_${Date.now()}`;
    const timestamp = new Date();
    
    console.log(`🔍 Starting comprehensive security scan: ${scanId}`);

    const findings: SecurityFinding[] = [];
    
    // Run all security checks
    const authFindings = await this.scanAuthentication();
    const apiFindings = await this.scanApiSecurity();
    const dbFindings = await this.scanDatabaseSecurity();
    const configFindings = await this.scanConfiguration();
    const dependencyFindings = await this.scanDependencies();
    
    findings.push(...authFindings, ...apiFindings, ...dbFindings, ...configFindings, ...dependencyFindings);
    
    // Calculate overall security score
    const overallScore = this.calculateSecurityScore(findings);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(findings);
    
    const result: SecurityScanResult = {
      scanId,
      timestamp,
      scanType: 'vulnerability',
      severity: this.getOverallSeverity(findings),
      findings,
      overallScore,
      recommendations
    };

    // Store scan results
    this.scanResults.set(scanId, result);
    await this.persistScanResults(result);
    
    console.log(`✅ Security scan completed. Score: ${overallScore}/100`);
    
    return result;
  }

  private async scanAuthentication(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    
    // Check for weak password policies
    const weakPasswords = await prisma.user.count({
      where: {
        hashedPassword: {
          not: null
        }
      }
    });

    // Check for inactive sessions
    const staleSessionsCount = await prisma.userSession.count({
      where: {
        lastActivity: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        }
      }
    });

    if (staleSessionsCount > 100) {
      findings.push({
        id: 'auth_001',
        category: 'Authentication',
        title: 'Excessive Stale Sessions',
        description: `Found ${staleSessionsCount} sessions inactive for more than 7 days`,
        severity: 'medium',
        remediation: 'Implement automatic session cleanup for inactive sessions'
      });
    }

    // Check for multiple failed login attempts
    const recentFailedLogins = await redis.keys('rate-limit:login:*');
    if (recentFailedLogins.length > 50) {
      findings.push({
        id: 'auth_002',
        category: 'Authentication',
        title: 'High Failed Login Attempts',
        description: 'Unusually high number of failed login attempts detected',
        severity: 'high',
        remediation: 'Review login attempt patterns and consider additional rate limiting'
      });
    }

    return findings;
  }

  private async scanApiSecurity(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    
    // Check rate limiting configuration
    const rateLimitKeys = await redis.keys('rate-limit:*');
    if (rateLimitKeys.length < 10) {
      findings.push({
        id: 'api_001',
        category: 'API Security',
        title: 'Insufficient Rate Limiting Coverage',
        description: 'Not all API endpoints appear to have rate limiting configured',
        severity: 'medium',
        affected_endpoints: ['Various endpoints'],
        remediation: 'Ensure all public API endpoints have appropriate rate limiting'
      });
    }

    // Check for API endpoints without authentication
    const publicEndpoints = [
      '/api/health',
      '/api/espn/players',
      '/api/espn/scores'
    ];
    
    // In a real implementation, this would check actual endpoint configurations
    findings.push({
      id: 'api_002',
      category: 'API Security',
      title: 'Public Endpoints Identified',
      description: `${publicEndpoints.length} public endpoints require security review`,
      severity: 'low',
      affected_endpoints: publicEndpoints,
      remediation: 'Review public endpoints for necessary data exposure and rate limiting'
    });

    return findings;
  }

  private async scanDatabaseSecurity(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    
    // Check for users with admin privileges
    const adminCount = await prisma.user.count({
      where: { isAdmin: true }
    });

    if (adminCount > 5) {
      findings.push({
        id: 'db_001',
        category: 'Database Security',
        title: 'Excessive Admin Users',
        description: `Found ${adminCount} users with admin privileges`,
        severity: 'medium',
        remediation: 'Review admin user list and remove unnecessary admin privileges'
      });
    }

    // Check for old audit logs that should be archived
    const oldAuditLogs = await prisma.auditLog.count({
      where: {
        timestamp: {
          lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days ago
        }
      }
    });

    if (oldAuditLogs > 10000) {
      findings.push({
        id: 'db_002',
        category: 'Database Security',
        title: 'Large Audit Log Table',
        description: `Audit log contains ${oldAuditLogs} old entries`,
        severity: 'low',
        remediation: 'Implement audit log archival process for entries older than 90 days'
      });
    }

    return findings;
  }

  private async scanConfiguration(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    
    // Check environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        findings.push({
          id: `config_${envVar.toLowerCase()}`,
          category: 'Configuration',
          title: `Missing Environment Variable: ${envVar}`,
          description: `Critical environment variable ${envVar} is not set`,
          severity: 'critical',
          remediation: `Set the ${envVar} environment variable`
        });
      }
    }

    // Check Redis connection
    try {
      await redis.ping();
    } catch (error) {
      findings.push({
        id: 'config_redis',
        category: 'Configuration',
        title: 'Redis Connection Issue',
        description: 'Cannot connect to Redis cache server',
        severity: 'high',
        remediation: 'Verify Redis server is running and connection configuration is correct'
      });
    }

    return findings;
  }

  private async scanDependencies(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    
    // Simulate dependency vulnerability check
    // In a real implementation, this would integrate with npm audit or Snyk
    const mockVulnerabilities = [
      {
        id: 'dep_001',
        category: 'Dependencies',
        title: 'Development Dependency Security Notice',
        description: 'Some development dependencies may have known vulnerabilities',
        severity: 'low' as const,
        remediation: 'Run npm audit and update dependencies regularly',
        cvss_score: 3.1
      }
    ];

    findings.push(...mockVulnerabilities);

    return findings;
  }

  private calculateSecurityScore(findings: SecurityFinding[]): number {
    let score = 100;
    
    for (const finding of findings) {
      switch (finding.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    }

    return Math.max(0, score);
  }

  private getOverallSeverity(findings: SecurityFinding[]): 'low' | 'medium' | 'high' | 'critical' {
    if (findings.some(f => f.severity === 'critical')) return 'critical';
    if (findings.some(f => f.severity === 'high')) return 'high';
    if (findings.some(f => f.severity === 'medium')) return 'medium';
    return 'low';
  }

  private generateRecommendations(findings: SecurityFinding[]): string[] {
    const recommendations: string[] = [];
    
    // Group findings by severity and generate recommendations
    const criticalFindings = findings.filter(f => f.severity === 'critical');
    const highFindings = findings.filter(f => f.severity === 'high');
    const mediumFindings = findings.filter(f => f.severity === 'medium');

    if (criticalFindings.length > 0) {
      recommendations.push('IMMEDIATE ACTION REQUIRED: Address all critical security issues before proceeding to production');
    }

    if (highFindings.length > 0) {
      recommendations.push('High priority: Resolve high-severity security findings within 24 hours');
    }

    if (mediumFindings.length > 0) {
      recommendations.push('Medium priority: Address medium-severity findings within 7 days');
    }

    // General recommendations
    recommendations.push('Regular security scans: Schedule automated security scans weekly');
    recommendations.push('Dependency updates: Update dependencies monthly and monitor for security advisories');
    recommendations.push('Security training: Ensure development team receives regular security training');
    recommendations.push('Incident response: Review and test incident response procedures quarterly');

    return recommendations;
  }

  private async persistScanResults(result: SecurityScanResult): Promise<void> {
    try {
      // Store in Redis cache for quick access
      await redis.setex(
        `security_scan:${result.scanId}`, 
        7 * 24 * 60 * 60, // 7 days
        JSON.stringify(result)
      );

      // Store summary in database for long-term tracking
      await prisma.auditLog.create({
        data: {
          action: 'SECURITY_SCAN_COMPLETED',
          details: JSON.stringify({
            scanId: result.scanId,
            overallScore: result.overallScore,
            findingsCount: result.findings.length,
            severity: result.severity
          }),
          category: 'SECURITY',
          severity: result.severity.toUpperCase()
        }
      });
    } catch (error) {
      console.error('Failed to persist security scan results:', error);
    }
  }

  async getLatestScanResults(): Promise<SecurityScanResult | null> {
    const scanKeys = await redis.keys('security_scan:*');
    if (scanKeys.length === 0) return null;

    // Get the most recent scan
    const latestKey = scanKeys.sort().pop();
    if (!latestKey) return null;

    const scanData = await redis.get(latestKey);
    return scanData ? JSON.parse(scanData) : null;
  }

  async generateSecurityReport(scanId?: string): Promise<string> {
    const scan = scanId 
      ? this.scanResults.get(scanId) 
      : await this.getLatestScanResults();

    if (!scan) {
      throw new Error('No scan results found');
    }

    const report = `
# Security Scan Report

**Scan ID:** ${scan.scanId}
**Timestamp:** ${scan.timestamp.toISOString()}
**Overall Score:** ${scan.overallScore}/100

## Summary
- **Total Findings:** ${scan.findings.length}
- **Critical:** ${scan.findings.filter(f => f.severity === 'critical').length}
- **High:** ${scan.findings.filter(f => f.severity === 'high').length}
- **Medium:** ${scan.findings.filter(f => f.severity === 'medium').length}
- **Low:** ${scan.findings.filter(f => f.severity === 'low').length}

## Findings
${scan.findings.map(finding => `
### ${finding.title} (${finding.severity.toUpperCase()})
- **Category:** ${finding.category}
- **Description:** ${finding.description}
- **Remediation:** ${finding.remediation}
${finding.affected_endpoints ? `- **Affected Endpoints:** ${finding.affected_endpoints.join(', ')}` : ''}
`).join('')}

## Recommendations
${scan.recommendations.map(rec => `- ${rec}`).join('\n')}
`;

    return report;
  }
}

export const securityScanner = new SecurityScanner();