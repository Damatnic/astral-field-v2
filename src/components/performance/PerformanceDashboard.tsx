import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  CpuChipIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface PerformanceSummary {
  totalMetrics: number;
  averagePageLoad: number;
  averageApiResponse: number;
  averageDbQuery: number;
  slowestQueries: Array<{
    name: string;
    value: number;
    timestamp: string;
  }>;
  alertCount: number;
  criticalAlerts: number;
}

interface PerformanceDashboardProps {
  className?: string;
}

export default function PerformanceDashboard({ className = '' }: PerformanceDashboardProps) {
  const { data: session } = useSession();
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchPerformanceSummary();
    }
  }, [session, timeRange]);

  const fetchPerformanceSummary = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/monitoring/performance?timeRange=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching performance summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Only show to admins
  if (!session?.user || session.user.role !== 'ADMIN') {
    return null;
  }

  const getStatusColor = (value: number, type: 'page' | 'api' | 'db') => {
    const thresholds = {
      page: { good: 1500, warning: 3000 },
      api: { good: 500, warning: 1000 },
      db: { good: 200, warning: 500 }
    };

    const threshold = thresholds[type];
    if (value <= threshold.good) return 'text-green-600 bg-green-50';
    if (value <= threshold.warning) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
          <p className="text-gray-600">System performance metrics and monitoring</p>
        </div>
        
        <div className="flex space-x-2">
          {(['1h', '24h', '7d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : summary ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Page Load Performance */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <GlobeAltIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-500">Avg Page Load</p>
                    <div 
                      className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        getStatusColor(summary.averagePageLoad, 'page')
                      }`}
                    >
                      {summary.averagePageLoad > 3000 ? 'Slow' : 
                       summary.averagePageLoad > 1500 ? 'OK' : 'Fast'}
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatDuration(summary.averagePageLoad)}
                  </p>
                </div>
              </div>
            </div>

            {/* API Response Performance */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ServerIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-500">Avg API Response</p>
                    <div 
                      className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        getStatusColor(summary.averageApiResponse, 'api')
                      }`}
                    >
                      {summary.averageApiResponse > 1000 ? 'Slow' : 
                       summary.averageApiResponse > 500 ? 'OK' : 'Fast'}
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatDuration(summary.averageApiResponse)}
                  </p>
                </div>
              </div>
            </div>

            {/* Database Query Performance */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CpuChipIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-500">Avg DB Query</p>
                    <div 
                      className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        getStatusColor(summary.averageDbQuery, 'db')
                      }`}
                    >
                      {summary.averageDbQuery > 500 ? 'Slow' : 
                       summary.averageDbQuery > 200 ? 'OK' : 'Fast'}
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatDuration(summary.averageDbQuery)}
                  </p>
                </div>
              </div>
            </div>

            {/* Alerts */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Performance Alerts</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-2xl font-bold text-gray-900">
                      {summary.alertCount}
                    </p>
                    {summary.criticalAlerts > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                        {summary.criticalAlerts} critical
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slowest Queries */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Slowest Database Queries</h3>
              <p className="text-sm text-gray-600">Top performing queries that may need optimization</p>
            </div>
            
            <div className="p-6">
              {summary.slowestQueries.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No slow queries detected</p>
              ) : (
                <div className="space-y-3">
                  {summary.slowestQueries.slice(0, 10).map((query, index) => (
                    <div 
                      key={`${query.name}-${index}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{query.name}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(query.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        query.value > 1000 ? 'bg-red-100 text-red-700' :
                        query.value > 500 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {formatDuration(query.value)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Performance Recommendations */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Performance Recommendations</h3>
              <p className="text-sm text-gray-600">Suggested optimizations based on current metrics</p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {summary.averagePageLoad > 3000 && (
                  <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">Slow Page Load Times</p>
                      <p className="text-sm text-red-700">
                        Average page load is {formatDuration(summary.averagePageLoad)}. Consider implementing code splitting and optimizing bundle size.
                      </p>
                    </div>
                  </div>
                )}

                {summary.averageApiResponse > 1000 && (
                  <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                    <ClockIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900">Slow API Responses</p>
                      <p className="text-sm text-yellow-700">
                        API responses averaging {formatDuration(summary.averageApiResponse)}. Consider adding caching and optimizing queries.
                      </p>
                    </div>
                  </div>
                )}

                {summary.averageDbQuery > 500 && (
                  <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg">
                    <CpuChipIcon className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-900">Slow Database Queries</p>
                      <p className="text-sm text-orange-700">
                        Database queries averaging {formatDuration(summary.averageDbQuery)}. Review indexes and query optimization.
                      </p>
                    </div>
                  </div>
                )}

                {summary.averagePageLoad <= 1500 && summary.averageApiResponse <= 500 && summary.averageDbQuery <= 200 && (
                  <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                    <ChartBarIcon className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900">Great Performance!</p>
                      <p className="text-sm text-green-700">
                        All performance metrics are within optimal ranges. Keep up the good work!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No performance data available</p>
        </div>
      )}
    </div>
  );
}