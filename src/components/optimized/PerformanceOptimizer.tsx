'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Activity, 
  Gauge, 
  Timer, 
 
  CheckCircle, 
  AlertTriangle,
  Info,
  BarChart3,
  RefreshCw
} from 'lucide-react';

// Performance metrics interface
interface PerformanceMetrics {
  fps: number;
  loadTime: number;
  memoryUsage: number;
  bundleSize: number;
  cacheHitRate: number;
  renderTime: number;
  interactionDelay: number;
  score: number;
}

// Performance optimization tracker
export function PerformanceOptimizer() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    loadTime: 1.2,
    memoryUsage: 45,
    bundleSize: 280,
    cacheHitRate: 85,
    renderTime: 16,
    interactionDelay: 50,
    score: 92
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizations] = useState([
    {
      id: 'lazy-loading',
      title: 'Lazy Loading Components',
      description: 'Dynamically load components as needed',
      impact: 'High',
      status: 'active',
      improvement: '35% faster initial load'
    },
    {
      id: 'virtual-scrolling',
      title: 'Virtual Scrolling',
      description: 'Render only visible list items',
      impact: 'High',
      status: 'active',
      improvement: '90% memory reduction'
    },
    {
      id: 'image-optimization',
      title: 'Image Optimization',
      description: 'WebP format with progressive loading',
      impact: 'Medium',
      status: 'active',
      improvement: '60% smaller images'
    },
    {
      id: 'debounced-search',
      title: 'Debounced Search',
      description: 'Reduce API calls during typing',
      impact: 'Medium',
      status: 'active',
      improvement: '80% fewer requests'
    },
    {
      id: 'memoization',
      title: 'React Memoization',
      description: 'Prevent unnecessary re-renders',
      impact: 'High',
      status: 'active',
      improvement: '50% faster updates'
    },
    {
      id: 'code-splitting',
      title: 'Code Splitting',
      description: 'Split bundles by route',
      impact: 'High',
      status: 'active',
      improvement: '40% smaller bundles'
    }
  ]);

  // Simulate performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        fps: Math.max(55, Math.min(60, prev.fps + (Math.random() - 0.5) * 2)),
        memoryUsage: Math.max(30, Math.min(60, prev.memoryUsage + (Math.random() - 0.5) * 5)),
        renderTime: Math.max(12, Math.min(20, prev.renderTime + (Math.random() - 0.5) * 2))
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const runOptimization = useCallback(async () => {
    setIsOptimizing(true);
    
    // Simulate optimization process
    const steps = ['Analyzing bundles', 'Optimizing images', 'Compressing assets', 'Updating cache'];
    
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Update UI with current step
    }
    
    // Simulate improved metrics
    setMetrics(prev => ({
      ...prev,
      loadTime: Math.max(0.8, prev.loadTime * 0.9),
      bundleSize: Math.max(200, prev.bundleSize * 0.85),
      cacheHitRate: Math.min(95, prev.cacheHitRate + 5),
      score: Math.min(98, prev.score + 3)
    }));
    
    setIsOptimizing(false);
  }, []);

  const performanceGrade = useMemo(() => {
    if (metrics.score >= 90) return 'A';
    if (metrics.score >= 80) return 'B';
    if (metrics.score >= 70) return 'C';
    if (metrics.score >= 60) return 'D';
    return 'F';
  }, [metrics.score]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Performance Overview */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
            <p className="text-gray-600">Real-time performance monitoring and optimization</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl ${getScoreBg(metrics.score)}`}>
              <Gauge className={`w-5 h-5 ${getScoreColor(metrics.score)}`} />
              <span className={`text-2xl font-bold ${getScoreColor(metrics.score)}`}>
                {performanceGrade}
              </span>
              <span className="text-sm text-gray-600">{metrics.score}</span>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={runOptimization}
              disabled={isOptimizing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>{isOptimizing ? 'Optimizing...' : 'Optimize Now'}</span>
            </motion.button>
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Frame Rate"
            value={`${metrics.fps.toFixed(1)} FPS`}
            icon={Activity}
            color="blue"
            target="60 FPS"
            isGood={metrics.fps >= 58}
          />
          <MetricCard
            title="Load Time"
            value={`${metrics.loadTime.toFixed(1)}s`}
            icon={Timer}
            color="green"
            target="< 2s"
            isGood={metrics.loadTime < 2}
          />
          <MetricCard
            title="Memory Usage"
            value={`${metrics.memoryUsage.toFixed(0)}%`}
            icon={BarChart3}
            color="purple"
            target="< 70%"
            isGood={metrics.memoryUsage < 70}
          />
          <MetricCard
            title="Bundle Size"
            value={`${metrics.bundleSize}KB`}
            icon={Zap}
            color="orange"
            target="< 300KB"
            isGood={metrics.bundleSize < 300}
          />
        </div>
      </div>

      {/* Active Optimizations */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Active Performance Optimizations</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {optimizations.map((optimization) => (
            <OptimizationCard
              key={optimization.id}
              optimization={optimization}
            />
          ))}
        </div>
      </div>

      {/* Performance Tips */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Performance Best Practices</h2>
        
        <div className="space-y-4">
          <TipCard
            icon={CheckCircle}
            title="Component Memoization"
            description="Use React.memo() and useMemo() to prevent unnecessary re-renders"
            status="implemented"
          />
          <TipCard
            icon={CheckCircle}
            title="Virtual Scrolling"
            description="Render only visible items in long lists for better performance"
            status="implemented"
          />
          <TipCard
            icon={CheckCircle}
            title="Lazy Loading"
            description="Load components and images only when needed"
            status="implemented"
          />
          <TipCard
            icon={Info}
            title="Service Workers"
            description="Cache resources for offline access and faster loading"
            status="recommended"
          />
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  target, 
  isGood 
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  target: string;
  isGood: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-4 h-4" />
        </div>
        {isGood ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        )}
      </div>
      
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{title}</div>
        <div className="text-xs text-gray-500 mt-1">Target: {target}</div>
      </div>
    </div>
  );
}

// Optimization Card Component
function OptimizationCard({ 
  optimization 
}: {
  optimization: {
    id: string;
    title: string;
    description: string;
    impact: string;
    status: string;
    improvement: string;
  };
}) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(optimization.impact)}`}>
          {optimization.impact} Impact
        </span>
        <CheckCircle className="w-4 h-4 text-green-500" />
      </div>
      
      <h3 className="font-semibold text-gray-900 mb-1">{optimization.title}</h3>
      <p className="text-sm text-gray-600 mb-2">{optimization.description}</p>
      <p className="text-xs text-green-600 font-medium">{optimization.improvement}</p>
    </motion.div>
  );
}

// Tip Card Component
function TipCard({ 
  icon: Icon, 
  title, 
  description, 
  status 
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  status: 'implemented' | 'recommended';
}) {
  return (
    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
      <Icon className={`w-5 h-5 mt-0.5 ${
        status === 'implemented' ? 'text-green-500' : 'text-blue-500'
      }`} />
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
        <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
          status === 'implemented' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-blue-100 text-blue-700'
        }`}>
          {status === 'implemented' ? 'Active' : 'Recommended'}
        </span>
      </div>
    </div>
  );
}