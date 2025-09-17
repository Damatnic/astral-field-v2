'use client';

import React from 'react';
import AIOracle from '@/components/oracle/AIOracle';
import { Brain, Sparkles, TrendingUp, Shield, Trophy } from 'lucide-react';

export default function OraclePage() {
  const features = [
    {
      icon: Sparkles,
      title: 'Lineup Optimization',
      description: 'AI-powered recommendations for your best starting lineup'
    },
    {
      icon: TrendingUp,
      title: 'Trade Analysis',
      description: 'Comprehensive evaluation of trade proposals and opportunities'
    },
    {
      icon: Shield,
      title: 'Injury Impact',
      description: 'Real-time analysis of how injuries affect your team'
    },
    {
      icon: Trophy,
      title: 'Championship Path',
      description: 'Strategic insights to maximize your playoff chances'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-xl">
              <Brain className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Fantasy Oracle AI
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Your intelligent fantasy football assistant powered by advanced AI to help you dominate your league
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div 
                key={idx}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Oracle Component */}
        <AIOracle />
      </div>
    </div>
  );
}