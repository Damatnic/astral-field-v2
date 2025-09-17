'use client';

import React from 'react';
import TradeCenter from '@/components/trade/TradeCenter';
import { ArrowLeftRight, TrendingUp, Users, Shield } from 'lucide-react';

export default function TradePage() {
  const stats = [
    {
      label: 'Active Trades',
      value: '3',
      change: '+2',
      icon: ArrowLeftRight,
      color: 'text-blue-600'
    },
    {
      label: 'Trade Success Rate',
      value: '78%',
      change: '+5%',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      label: 'Avg Trade Value',
      value: '186',
      change: '+12',
      icon: Users,
      color: 'text-purple-600'
    },
    {
      label: 'Fair Trade Score',
      value: '82',
      change: '+8',
      icon: Shield,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Trade Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analyze, negotiate, and execute trades with AI-powered insights
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {stat.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Trade Center Component */}
        <TradeCenter />
      </div>
    </div>
  );
}