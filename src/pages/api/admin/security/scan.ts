import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { securityScanner } from '@/lib/security/security-scanner';
import { rateLimit } from '@/lib/utils/rate-limit';

const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 10,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !session.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Rate limit security scans to prevent abuse
  try {
    await limiter.check(res, 1, session.user.id); // 1 scan per hour per admin
  } catch {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Security scans limited to 1 per hour.' 
    });
  }

  switch (req.method) {
    case 'POST':
      try {
        const { scanType = 'comprehensive' } = req.body;

        if (scanType !== 'comprehensive') {
          return res.status(400).json({ 
            error: 'Only comprehensive scans are currently supported' 
          });
        }

        // Trigger security scan
        const scanResult = await securityScanner.performComprehensiveSecurityScan();

        return res.status(200).json({
          success: true,
          scanId: scanResult.scanId,
          message: 'Security scan completed successfully',
          summary: {
            overallScore: scanResult.overallScore,
            severity: scanResult.severity,
            findingsCount: scanResult.findings.length,
            criticalFindings: scanResult.findings.filter(f => f.severity === 'critical').length,
            highFindings: scanResult.findings.filter(f => f.severity === 'high').length
          },
          recommendations: scanResult.recommendations.slice(0, 3) // Top 3 recommendations
        });

      } catch (error) {
        console.error('Security scan failed:', error);
        return res.status(500).json({
          error: 'Security scan failed',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }

    case 'GET':
      try {
        const { scanId, format = 'json' } = req.query;

        if (scanId && typeof scanId === 'string') {
          // Get specific scan results
          const scanResults = await securityScanner.getLatestScanResults();
          
          if (!scanResults || scanResults.scanId !== scanId) {
            return res.status(404).json({ error: 'Scan results not found' });
          }

          if (format === 'report') {
            const report = await securityScanner.generateSecurityReport(scanId);
            res.setHeader('Content-Type', 'text/markdown');
            res.setHeader('Content-Disposition', `attachment; filename="security-report-${scanId}.md"`);
            return res.status(200).send(report);
          }

          return res.status(200).json(scanResults);
        } else {
          // Get latest scan summary
          const latestScan = await securityScanner.getLatestScanResults();
          
          if (!latestScan) {
            return res.status(200).json({
              message: 'No security scans found',
              recommendation: 'Run your first security scan to establish a baseline'
            });
          }

          return res.status(200).json({
            scanId: latestScan.scanId,
            timestamp: latestScan.timestamp,
            overallScore: latestScan.overallScore,
            severity: latestScan.severity,
            summary: {
              totalFindings: latestScan.findings.length,
              criticalFindings: latestScan.findings.filter(f => f.severity === 'critical').length,
              highFindings: latestScan.findings.filter(f => f.severity === 'high').length,
              mediumFindings: latestScan.findings.filter(f => f.severity === 'medium').length,
              lowFindings: latestScan.findings.filter(f => f.severity === 'low').length
            },
            topRecommendations: latestScan.recommendations.slice(0, 5)
          });
        }

      } catch (error) {
        console.error('Failed to retrieve security scan results:', error);
        return res.status(500).json({
          error: 'Failed to retrieve security scan results'
        });
      }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}