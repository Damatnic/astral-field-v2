'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  LiveScoresTicker, 
  LivePlayerUpdates, 
  InjuryReport as InjuryReportComponent, 
  NewsFeed 
} from '@/components/ui/live-data-components';
import { EnhancedCard } from '@/components/ui/enhanced-components';

export default function LiveDataDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header */}
      <motion.div 
        className="bg-gradient-to-r from-green-900 via-blue-900 to-purple-900 text-white relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                LIVE DATA
              </span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Live Fantasy Central
            </h1>
            
            <p className="text-xl text-blue-100 max-w-2xl">
              Stay ahead of the competition with real-time scores, player updates, injury reports, and breaking news.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Live Scores Ticker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <LiveScoresTicker />
      </motion.div>

      {/* Main Dashboard Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Live Player Updates */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <LivePlayerUpdates />
          </motion.div>

          {/* Injury Report */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <InjuryReportComponent />
          </motion.div>
        </div>

        {/* News Feed - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <NewsFeed />
        </motion.div>

        {/* Real-time Stats Grid */}
        <motion.div
          className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <EnhancedCard className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">12</div>
            <div className="text-sm text-gray-600">Games Live</div>
          </EnhancedCard>
          
          <EnhancedCard className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">147</div>
            <div className="text-sm text-gray-600">Active Updates</div>
          </EnhancedCard>
          
          <EnhancedCard className="p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">23</div>
            <div className="text-sm text-gray-600">Injury Reports</div>
          </EnhancedCard>
          
          <EnhancedCard className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">89</div>
            <div className="text-sm text-gray-600">Breaking News</div>
          </EnhancedCard>
        </motion.div>

        {/* Data Update Status */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <EnhancedCard className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>All systems operational</span>
              </div>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </EnhancedCard>
        </motion.div>
      </div>
    </div>
  );
}