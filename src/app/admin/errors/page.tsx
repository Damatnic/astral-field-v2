'use client';

/**
 * Error Reporting Dashboard
 * Comprehensive error monitoring and analytics dashboard for administrators
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users,
  Database,
  Shield,
  Network,
  Bug,
  Filter,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { ErrorSeverity, ErrorCategory } from '@/lib/error-tracking';

// Dashboard data interfaces
interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  uniqueErrors: number;
  affectedUsers: number;
  mttr: number; // Mean Time To Resolution in minutes
  trends: {
    errors: { change: number; changePercent: number; trend: 'up' | 'down' | 'stable' };
    rate: { change: number; changePercent: number; trend: 'up' | 'down' | 'stable' };
  };
}

interface ErrorBreakdown {
  bySeverity: Record<ErrorSeverity, number>;
  byCategory: Record<ErrorCategory, number>;
  byComponent: Record<string, number>;
}

interface TopError {
  fingerprint: string;
  message: string;
  count: number;
  severity: ErrorSeverity;
  category: ErrorCategory;
  component: string;
  lastSeen: string;
  firstSeen: string;
  resolved: boolean;
}

interface DashboardData {
  metrics: ErrorMetrics;
  breakdown: ErrorBreakdown;
  topErrors: TopError[];
  timeSeries: Array<{
    time: string;
    errorCount: number;
    uniqueErrors: number;
    severity: ErrorSeverity;
    category: ErrorCategory;
  }>;
  systemHealth: {
    status: 'healthy' | 'degraded' | 'critical';
    uptime: number;
    errorRate: number;
    responseTime: number;
  };
}

export default function ErrorDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [filters, setFilters] = useState({
    severity: [] as ErrorSeverity[],
    category: [] as ErrorCategory[],
    component: '',
    showResolved: false
  });
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams({
        timeRange,
        ...(filters.severity.length > 0 && { severity: filters.severity.join(',') }),
        ...(filters.category.length > 0 && { category: filters.category.join(',') }),
        ...(filters.component && { component: filters.component }),
        showResolved: filters.showResolved.toString()
      });

      const response = await fetch(`/api/errors/analytics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data.analytics);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, filters]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [timeRange, filters]);

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return 'text-red-600 bg-red-100';
      case ErrorSeverity.HIGH: return 'text-orange-600 bg-orange-100';
      case ErrorSeverity.MEDIUM: return 'text-yellow-600 bg-yellow-100';
      case ErrorSeverity.LOW: return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: ErrorCategory) => {
    switch (category) {
      case ErrorCategory.DATABASE_ERROR: return Database;
      case ErrorCategory.NETWORK_ERROR: return Network;
      case ErrorCategory.AUTHENTICATION_ERROR:
      case ErrorCategory.AUTHORIZATION_ERROR: return Shield;
      default: return Bug;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const exportData = () => {
    if (!dashboardData) return;
    
    const dataStr = JSON.stringify(dashboardData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading error dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Dashboard Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Error Monitoring Dashboard</h1>
                <p className="text-gray-600">Real-time error tracking and analytics</p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* System Health Status */}
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthStatusColor(dashboardData.systemHealth.status)}`}>
                  {dashboardData.systemHealth.status.charAt(0).toUpperCase() + dashboardData.systemHealth.status.slice(1)}
                </div>
                
                {/* Time Range Selector */}
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="1h">Last Hour</option>
                  <option value="6h">Last 6 Hours</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
                
                {/* Actions */}
                <button
                  onClick={fetchDashboardData}
                  disabled={refreshing}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                
                <button
                  onClick={exportData}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Errors</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.metrics.totalErrors.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {dashboardData.metrics.trends.errors.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-red-600 mr-1" />
              ) : dashboardData.metrics.trends.errors.trend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-green-600 mr-1" />
              ) : null}
              <span className={`text-sm ${
                dashboardData.metrics.trends.errors.trend === 'up' ? 'text-red-600' :
                dashboardData.metrics.trends.errors.trend === 'down' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {Math.abs(dashboardData.metrics.trends.errors.changePercent).toFixed(1)}% from previous period
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.metrics.errorRate.toFixed(1)}/hr</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {dashboardData.metrics.trends.rate.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-red-600 mr-1" />
              ) : dashboardData.metrics.trends.rate.trend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-green-600 mr-1" />
              ) : null}
              <span className={`text-sm ${
                dashboardData.metrics.trends.rate.trend === 'up' ? 'text-red-600' :
                dashboardData.metrics.trends.rate.trend === 'down' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {Math.abs(dashboardData.metrics.trends.rate.changePercent).toFixed(1)}% from previous period
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unique Errors</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.metrics.uniqueErrors}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bug className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Affected Users</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.metrics.affectedUsers}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">MTTR</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.metrics.mttr ? formatDuration(dashboardData.metrics.mttr) : 'N/A'}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Error Breakdown Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* By Severity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Errors by Severity</h3>
            <div className="space-y-3">
              {Object.entries(dashboardData.breakdown.bySeverity).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(severity as ErrorSeverity)}`}>
                      {severity}
                    </div>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* By Category */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Errors by Category</h3>
            <div className="space-y-3">
              {Object.entries(dashboardData.breakdown.byCategory).slice(0, 5).map(([category, count]) => {
                const IconComponent = getCategoryIcon(category as ErrorCategory);
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <IconComponent className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-700">{category.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* By Component */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Components</h3>
            <div className="space-y-3">
              {Object.entries(dashboardData.breakdown.byComponent).slice(0, 5).map(([component, count]) => (
                <div key={component} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate">{component}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Top Errors Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Top Errors</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Component
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Seen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.topErrors.map((error) => (
                  <tr key={error.fingerprint} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={error.message}>
                        {error.message}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(error.severity)}`}>
                        {error.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {error.category.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {error.component}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {error.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(error.lastSeen).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        error.resolved ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                      }`}>
                        {error.resolved ? 'Resolved' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}