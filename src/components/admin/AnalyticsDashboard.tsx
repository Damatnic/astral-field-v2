import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  ChartBarIcon,
  UsersIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface AnalyticsMetrics {
  users: {
    total: number;
    active: number;
    newToday: number;
    retentionRate: number;
    growth: number;
  };
  leagues: {
    total: number;
    active: number;
    completed: number;
    averageTeams: number;
    growth: number;
  };
  engagement: {
    dailyActiveUsers: number;
    averageSessionDuration: number;
    pageViews: number;
    bounceRate: number;
    growth: number;
  };
  performance: {
    averagePageLoad: number;
    apiResponseTime: number;
    errorRate: number;
    uptime: number;
  };
  revenue: {
    totalRevenue: number;
    monthlyRecurring: number;
    conversionRate: number;
    churnRate: number;
  };
}

interface TimeSeriesData {
  date: string;
  users: number;
  leagues: number;
  revenue: number;
}

export default function AnalyticsDashboard() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [isLoading, setIsLoading] = useState(true);

  // Only allow admin access
  if (!session?.user || session.user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [metricsRes, timeSeriesRes] = await Promise.all([
        fetch(`/api/admin/analytics/metrics?timeRange=${timeRange}`),
        fetch(`/api/admin/analytics/time-series?timeRange=${timeRange}`)
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (timeSeriesRes.ok) {
        const timeSeriesData = await timeSeriesRes.json();
        setTimeSeriesData(timeSeriesData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Platform performance and usage insights</p>
        </div>
        
        <div className="flex space-x-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <MetricCard
          title="Total Users"
          value={metrics.users.total.toLocaleString()}
          subtitle={`${metrics.users.active.toLocaleString()} active`}
          change={metrics.users.growth}
          icon={UsersIcon}
          color="blue"
        />

        {/* Active Leagues */}
        <MetricCard
          title="Active Leagues"
          value={metrics.leagues.active.toLocaleString()}
          subtitle={`${metrics.leagues.total.toLocaleString()} total`}
          change={metrics.leagues.growth}
          icon={TrophyIcon}
          color="green"
        />

        {/* Daily Active Users */}
        <MetricCard
          title="Daily Active Users"
          value={metrics.engagement.dailyActiveUsers.toLocaleString()}
          subtitle={`${metrics.users.retentionRate.toFixed(1)}% retention`}
          change={metrics.engagement.growth}
          icon={ChartBarIcon}
          color="purple"
        />

        {/* Average Session */}
        <MetricCard
          title="Avg Session"
          value={`${Math.round(metrics.engagement.averageSessionDuration / 60)}m`}
          subtitle={`${metrics.engagement.bounceRate.toFixed(1)}% bounce rate`}
          change={0}
          icon={ClockIcon}
          color="orange"
        />
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {metrics.performance.averagePageLoad}ms
            </div>
            <div className="text-sm text-gray-600">Avg Page Load</div>
            <div className={`text-xs mt-1 ${
              metrics.performance.averagePageLoad < 1500 ? 'text-green-600' : 
              metrics.performance.averagePageLoad < 3000 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {metrics.performance.averagePageLoad < 1500 ? 'Excellent' : 
               metrics.performance.averagePageLoad < 3000 ? 'Good' : 'Needs Improvement'}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {metrics.performance.apiResponseTime}ms
            </div>
            <div className="text-sm text-gray-600">API Response</div>
            <div className={`text-xs mt-1 ${
              metrics.performance.apiResponseTime < 500 ? 'text-green-600' : 
              metrics.performance.apiResponseTime < 1000 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {metrics.performance.apiResponseTime < 500 ? 'Fast' : 
               metrics.performance.apiResponseTime < 1000 ? 'Acceptable' : 'Slow'}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {(metrics.performance.errorRate * 100).toFixed(2)}%
            </div>
            <div className="text-sm text-gray-600">Error Rate</div>
            <div className={`text-xs mt-1 ${
              metrics.performance.errorRate < 0.01 ? 'text-green-600' : 
              metrics.performance.errorRate < 0.05 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {metrics.performance.errorRate < 0.01 ? 'Excellent' : 
               metrics.performance.errorRate < 0.05 ? 'Good' : 'High'}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {(metrics.performance.uptime * 100).toFixed(2)}%
            </div>
            <div className="text-sm text-gray-600">Uptime</div>
            <div className={`text-xs mt-1 ${
              metrics.performance.uptime > 0.999 ? 'text-green-600' : 
              metrics.performance.uptime > 0.99 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {metrics.performance.uptime > 0.999 ? 'Excellent' : 
               metrics.performance.uptime > 0.99 ? 'Good' : 'Poor'}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Growth</h3>
          <SimpleLineChart 
            data={timeSeriesData.map(d => ({ date: d.date, value: d.users }))}
            color="blue"
          />
        </div>

        {/* League Activity Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">League Activity</h3>
          <SimpleLineChart 
            data={timeSeriesData.map(d => ({ date: d.date, value: d.leagues }))}
            color="green"
          />
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Insights</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">New Users (Today)</span>
              <span className="font-semibold">{metrics.users.newToday}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Users</span>
              <span className="font-semibold">{metrics.users.active.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Retention Rate</span>
              <span className="font-semibold">{metrics.users.retentionRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Page Views</span>
              <span className="font-semibold">{metrics.engagement.pageViews.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* League Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">League Insights</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Leagues</span>
              <span className="font-semibold">{metrics.leagues.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completed Leagues</span>
              <span className="font-semibold">{metrics.leagues.completed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Teams/League</span>
              <span className="font-semibold">{metrics.leagues.averageTeams.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">League Growth</span>
              <span className={`font-semibold ${metrics.leagues.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.leagues.growth >= 0 ? '+' : ''}{metrics.leagues.growth.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Insights</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-semibold">${metrics.revenue.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Recurring</span>
              <span className="font-semibold">${metrics.revenue.monthlyRecurring.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Conversion Rate</span>
              <span className="font-semibold">{(metrics.revenue.conversionRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Churn Rate</span>
              <span className="font-semibold">{(metrics.revenue.churnRate * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function MetricCard({ title, value, subtitle, change, icon: Icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <div className="flex items-center mt-1">
            <p className="text-sm text-gray-600">{subtitle}</p>
            {change !== 0 && (
              <div className={`ml-2 flex items-center text-xs ${
                change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {change >= 0 ? (
                  <ArrowTrendingUpIcon className="h-4 w-4" />
                ) : (
                  <ArrowTrendingDownIcon className="h-4 w-4" />
                )}
                <span className="ml-1">{Math.abs(change).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SimpleLineChartProps {
  data: Array<{ date: string; value: number }>;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function SimpleLineChart({ data, color }: SimpleLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const colorClasses = {
    blue: 'stroke-blue-600 fill-blue-50',
    green: 'stroke-green-600 fill-green-50',
    purple: 'stroke-purple-600 fill-purple-50',
    orange: 'stroke-orange-600 fill-orange-50'
  };

  return (
    <div className="h-32">
      <svg width="100%" height="100%" className="overflow-visible">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" className={colorClasses[color].split(' ')[1]} stopOpacity={0.3} />
            <stop offset="100%" className={colorClasses[color].split(' ')[1]} stopOpacity={0} />
          </linearGradient>
        </defs>
        
        {/* Data points and lines would be rendered here */}
        <polyline
          fill="none"
          className={colorClasses[color].split(' ')[0]}
          strokeWidth="2"
          points={data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - ((d.value - minValue) / range) * 80;
            return `${x},${y}`;
          }).join(' ')}
        />
        
        {/* Fill area */}
        <polygon
          fill={`url(#gradient-${color})`}
          points={
            data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 100 - ((d.value - minValue) / range) * 80;
              return `${x},${y}`;
            }).join(' ') + ` 100,100 0,100`
          }
        />
      </svg>
    </div>
  );
}