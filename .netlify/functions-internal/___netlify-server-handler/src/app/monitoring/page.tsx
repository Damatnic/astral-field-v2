'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Database, 
  Globe, 
  Zap,
  TrendingUp,
  TrendingDown,
  Server,
  Cpu,
  HardDrive,
  Wifi
} from 'lucide-react';

interface MetricData {
  value: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface SystemMetrics {
  cpu: MetricData;
  memory: MetricData;
  disk: MetricData;
  network: MetricData;
}

interface PerformanceMetrics {
  responseTime: MetricData;
  throughput: MetricData;
  errorRate: MetricData;
  uptime: MetricData;
}

interface DatabaseMetrics {
  connections: MetricData;
  queryTime: MetricData;
  cacheHitRate: MetricData;
  deadlocks: MetricData;
}

export default function MonitoringDashboard() {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpu: { value: 45, trend: 'stable', change: 0, status: 'healthy' },
    memory: { value: 62, trend: 'up', change: 5, status: 'healthy' },
    disk: { value: 38, trend: 'up', change: 2, status: 'healthy' },
    network: { value: 78, trend: 'down', change: -3, status: 'healthy' }
  });

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    responseTime: { value: 142, trend: 'down', change: -8, status: 'healthy' },
    throughput: { value: 1250, trend: 'up', change: 15, status: 'healthy' },
    errorRate: { value: 0.3, trend: 'stable', change: 0, status: 'healthy' },
    uptime: { value: 99.98, trend: 'stable', change: 0, status: 'healthy' }
  });

  const [databaseMetrics, setDatabaseMetrics] = useState<DatabaseMetrics>({
    connections: { value: 45, trend: 'stable', change: 0, status: 'healthy' },
    queryTime: { value: 23, trend: 'down', change: -5, status: 'healthy' },
    cacheHitRate: { value: 94.5, trend: 'up', change: 2, status: 'healthy' },
    deadlocks: { value: 0, trend: 'stable', change: 0, status: 'healthy' }
  });

  const [realTimeData, setRealTimeData] = useState<number[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      setRealTimeData(prev => {
        const newData = [...prev, Math.random() * 100];
        return newData.slice(-20);
      });

      // Update metrics with simulated values
      setSystemMetrics(prev => ({
        cpu: { ...prev.cpu, value: Math.min(100, prev.cpu.value + (Math.random() - 0.5) * 10) },
        memory: { ...prev.memory, value: Math.min(100, prev.memory.value + (Math.random() - 0.5) * 5) },
        disk: { ...prev.disk, value: Math.min(100, prev.disk.value + (Math.random() - 0.5) * 2) },
        network: { ...prev.network, value: Math.min(100, prev.network.value + (Math.random() - 0.5) * 15) }
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Performance Monitoring Dashboard
          </h1>
          <p className="text-gray-300">Real-time system metrics and performance analytics</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Server className="w-8 h-8 text-blue-400" />
                <Badge className="bg-green-500/20 text-green-400">Healthy</Badge>
              </div>
              <h3 className="text-2xl font-bold text-white">99.98%</h3>
              <p className="text-gray-400 text-sm">Uptime</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-8 h-8 text-yellow-400" />
                <span className="text-green-400 text-sm">-8ms</span>
              </div>
              <h3 className="text-2xl font-bold text-white">142ms</h3>
              <p className="text-gray-400 text-sm">Avg Response</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-purple-400" />
                <span className="text-green-400 text-sm">+15%</span>
              </div>
              <h3 className="text-2xl font-bold text-white">1.25K</h3>
              <p className="text-gray-400 text-sm">Requests/min</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <Badge className="bg-green-500/20 text-green-400">Low</Badge>
              </div>
              <h3 className="text-2xl font-bold text-white">0.3%</h3>
              <p className="text-gray-400 text-sm">Error Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="system" className="space-y-4">
          <TabsList className="bg-gray-800/50 backdrop-blur border-gray-700">
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="realtime">Real-Time</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          {/* System Metrics Tab */}
          <TabsContent value="system" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(systemMetrics).map(([key, metric]) => (
                <Card key={key} className="bg-gray-800/50 backdrop-blur border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-white capitalize">{key}</CardTitle>
                    {getTrendIcon(metric.trend)}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-3xl font-bold text-white">
                        {metric.value.toFixed(1)}%
                      </span>
                      <span className={`text-sm ${metric.change > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {metric.change > 0 ? '+' : ''}{metric.change}%
                      </span>
                    </div>
                    <Progress value={metric.value} className="h-2" />
                    <div className="mt-2">
                      <span className={`text-sm ${getStatusColor(metric.status)}`}>
                        Status: {metric.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">P50</span>
                      <span className="text-white">142ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">P95</span>
                      <span className="text-white">298ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">P99</span>
                      <span className="text-white">512ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Throughput</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current</span>
                      <span className="text-white">1,250 req/min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Peak Today</span>
                      <span className="text-white">2,847 req/min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Average</span>
                      <span className="text-white">1,123 req/min</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(databaseMetrics).map(([key, metric]) => (
                <Card key={key} className="bg-gray-800/50 backdrop-blur border-gray-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">
                        {key === 'queryTime' ? `${metric.value}ms` : 
                         key === 'cacheHitRate' ? `${metric.value}%` :
                         metric.value}
                      </span>
                      {getTrendIcon(metric.trend)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Real-Time Tab */}
          <TabsContent value="realtime" className="space-y-4">
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Live Metrics Stream</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end gap-1">
                  {realTimeData.map((value, index) => (
                    <div
                      key={index}
                      className="flex-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-t"
                      style={{ height: `${value}%` }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            {alerts.length === 0 ? (
              <Alert className="bg-green-500/10 border-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-400">
                  No active alerts. All systems operating normally.
                </AlertDescription>
              </Alert>
            ) : (
              alerts.map((alert, index) => (
                <Alert key={index} className="bg-red-500/10 border-red-500/20">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-400">
                    {alert.message}
                  </AlertDescription>
                </Alert>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Footer Stats */}
        <div className="mt-8 flex justify-between items-center text-gray-400 text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Last updated: Just now
            </span>
            <span className="flex items-center gap-1">
              <Wifi className="w-4 h-4 text-green-400" />
              Connected
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>Data retention: 30 days</span>
            <span>Refresh rate: 2s</span>
          </div>
        </div>
      </div>
    </div>
  );
}