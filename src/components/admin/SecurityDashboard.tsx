import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Play, 
  Download,
  Clock,
  TrendingUp,
  TrendingDown,
  Eye,
  RefreshCw
} from 'lucide-react';

interface SecurityScanSummary {
  scanId: string;
  timestamp: string;
  overallScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: {
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
  };
  topRecommendations: string[];
}

interface SecurityFinding {
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

export default function SecurityDashboard() {
  const [scanSummary, setScanSummary] = useState<SecurityScanSummary | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestScan();
  }, []);

  const fetchLatestScan = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/security/scan');
      const data = await response.json();

      if (response.ok) {
        if (data.scanId) {
          setScanSummary(data);
        } else {
          setScanSummary(null);
        }
      } else {
        setError(data.error || 'Failed to fetch security scan results');
      }
    } catch (err) {
      setError('Failed to connect to security service');
    } finally {
      setIsLoading(false);
    }
  };

  const runSecurityScan = async () => {
    try {
      setIsScanning(true);
      setError(null);

      const response = await fetch('/api/admin/security/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanType: 'comprehensive' })
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh the scan results
        await fetchLatestScan();
      } else {
        setError(data.error || 'Security scan failed');
      }
    } catch (err) {
      setError('Failed to run security scan');
    } finally {
      setIsScanning(false);
    }
  };

  const downloadSecurityReport = async () => {
    if (!scanSummary?.scanId) return;

    try {
      const response = await fetch(`/api/admin/security/scan?scanId=${scanSummary.scanId}&format=report`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-report-${scanSummary.scanId}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Failed to download security report');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-8 w-8 text-green-500" />;
    if (score >= 75) return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
    return <XCircle className="h-8 w-8 text-red-500" />;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading security dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and manage application security posture</p>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={fetchLatestScan} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button 
            onClick={runSecurityScan} 
            disabled={isScanning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isScanning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Security Scan
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {!scanSummary ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Security Scans Found</h3>
            <p className="text-gray-600 mb-4">
              Run your first security scan to establish a baseline security posture.
            </p>
            <Button 
              onClick={runSecurityScan} 
              disabled={isScanning}
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              Run First Security Scan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="findings">Findings</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Security Score Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    {getScoreIcon(scanSummary.overallScore)}
                    <div>
                      <div className={`text-4xl font-bold ${getScoreColor(scanSummary.overallScore)}`}>
                        {scanSummary.overallScore}
                      </div>
                      <div className="text-sm text-gray-500">out of 100</div>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Overall Security Posture</span>
                      <Badge className={getSeverityColor(scanSummary.severity)}>
                        {scanSummary.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${
                          scanSummary.overallScore >= 90 ? 'bg-green-500' :
                          scanSummary.overallScore >= 75 ? 'bg-yellow-500' :
                          scanSummary.overallScore >= 50 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${scanSummary.overallScore}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Last scan: {new Date(scanSummary.timestamp).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      Scan ID: {scanSummary.scanId.slice(-8)}
                    </div>
                    <Button 
                      onClick={downloadSecurityReport}
                      variant="ghost" 
                      size="sm"
                      className="ml-auto"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Findings Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Critical</p>
                      <p className="text-2xl font-bold text-red-600">
                        {scanSummary.summary.criticalFindings}
                      </p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">High</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {scanSummary.summary.highFindings}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Medium</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {scanSummary.summary.mediumFindings}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Low</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {scanSummary.summary.lowFindings}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scanSummary.topRecommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                      <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                        <span className="text-xs font-bold text-blue-600 w-4 h-4 flex items-center justify-center">
                          {index + 1}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 flex-1">{recommendation}</p>
                    </div>
                  ))}
                </div>
                
                {scanSummary.topRecommendations.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600">No security recommendations at this time.</p>
                    <p className="text-sm text-gray-500">Your security posture looks excellent!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="findings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Findings</CardTitle>
                <p className="text-sm text-gray-600">
                  Detailed breakdown of identified security issues
                </p>
              </CardHeader>
              <CardContent>
                {scanSummary.summary.totalFindings === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="font-semibold text-green-700">No security findings!</p>
                    <p className="text-sm text-gray-600">Your application appears to be secure.</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Eye className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">
                      {scanSummary.summary.totalFindings} security findings detected
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      Download the full report for detailed analysis
                    </p>
                    <Button onClick={downloadSecurityReport} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download Full Report
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scan History</CardTitle>
                <p className="text-sm text-gray-600">
                  Track security improvements over time
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Scan history will appear here after multiple scans</p>
                  <p className="text-sm text-gray-500">Run regular scans to track security trends</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}