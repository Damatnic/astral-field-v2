'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Zap, Target, Brain, Clock, Award, TrendingUp, Filter } from 'lucide-react';
import { SearchProvider } from '@/utils/search';
import AdvancedSearchInterface from '@/components/search/AdvancedSearchInterface';
import SearchResults from '@/components/search/SearchResults';

export default function AdvancedSearchPage() {
  const [activeTab, setActiveTab] = useState<'search' | 'analytics' | 'recommendations'>('search');

  return (
    <SearchProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <Search className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Advanced Player Search
              </h1>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Discover, analyze, and compare fantasy football players with ESPN/Yahoo-level search capabilities.
              Intelligent suggestions, advanced filtering, and powerful analytics at your fingertips.
            </p>
          </motion.div>

          {/* Feature Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
          >
            <FeatureCard
              icon={<Brain className="w-6 h-6" />}
              title="Smart Suggestions"
              description="AI-powered search suggestions with context-aware recommendations"
              gradient="from-purple-500 to-pink-500"
            />
            <FeatureCard
              icon={<Filter className="w-6 h-6" />}
              title="Advanced Filters"
              description="Multi-parameter filtering with position, team, injury status, and more"
              gradient="from-blue-500 to-cyan-500"
            />
            <FeatureCard
              icon={<Target className="w-6 h-6" />}
              title="Player Comparison"
              description="Side-by-side analysis with detailed stats and projections"
              gradient="from-green-500 to-emerald-500"
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Saved Searches"
              description="Save and organize your favorite search combinations"
              gradient="from-orange-500 to-red-500"
            />
          </motion.div>

          {/* Navigation Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 mb-8"
          >
            <TabButton
              active={activeTab === 'search'}
              onClick={() => setActiveTab('search')}
              icon={<Search className="w-4 h-4" />}
              label="Player Search"
            />
            <TabButton
              active={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
              icon={<TrendingUp className="w-4 h-4" />}
              label="Search Analytics"
            />
            <TabButton
              active={activeTab === 'recommendations'}
              onClick={() => setActiveTab('recommendations')}
              icon={<Award className="w-4 h-4" />}
              label="Recommendations"
            />
          </motion.div>

          {/* Main Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'search' && (
              <div className="space-y-8">
                {/* Search Interface */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-xl">
                  <AdvancedSearchInterface
                    placeholder="Search for players, teams, positions, or try 'top QB rankings'..."
                    showFilters={true}
                    showSavedSearches={true}
                    className="mb-8"
                  />
                </div>

                {/* Search Results */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
                  <SearchResults
                    showViewOptions={true}
                    enableComparison={true}
                    showQuickActions={true}
                  />
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <SearchAnalyticsDashboard />
            )}

            {activeTab === 'recommendations' && (
              <SmartRecommendations />
            )}
          </motion.div>

          {/* Quick Search Examples */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-8"
          >
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Quick Search Examples
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <QuickSearchExample
                query="Josh Allen"
                description="Find specific players by name"
                icon="👤"
              />
              <QuickSearchExample
                query="QB rankings week 1"
                description="Position-based searches with context"
                icon="📊"
              />
              <QuickSearchExample
                query="RB injury report"
                description="Position + status combinations"
                icon="🏥"
              />
              <QuickSearchExample
                query="waiver wire pickups"
                description="Strategic search queries"
                icon="🎯"
              />
              <QuickSearchExample
                query="Chiefs offensive players"
                description="Team-specific searches"
                icon="🏈"
              />
              <QuickSearchExample
                query="sleeper picks TE"
                description="Advanced strategy searches"
                icon="💎"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </SearchProvider>
  );
}

// Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, gradient }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center shadow-lg hover:shadow-xl transition-shadow"
    >
      <div className={`w-12 h-12 bg-gradient-to-r ${gradient} rounded-xl flex items-center justify-center text-white mx-auto mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
};

// Tab Button Component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
        active
          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 transform scale-105'
          : 'bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

// Quick Search Example Component
interface QuickSearchExampleProps {
  query: string;
  description: string;
  icon: string;
}

const QuickSearchExample: React.FC<QuickSearchExampleProps> = ({ query, description, icon }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left group"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <div className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
            {query}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </div>
        </div>
      </div>
    </motion.button>
  );
};

// Search Analytics Dashboard Component
const SearchAnalyticsDashboard: React.FC = () => {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Search Analytics</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Popular Searches */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Popular Searches</h3>
          <div className="space-y-3">
            {['Josh Allen', 'Christian McCaffrey', 'QB rankings', 'waiver wire', 'injury report'].map((search, index) => (
              <div key={search} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">{search}</span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {Math.floor(Math.random() * 500 + 100)} searches
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search Trends */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Search Trends</h3>
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white">Position Searches</span>
                <span className="text-sm text-green-600 dark:text-green-400">↗ 12%</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">QB</span>
                  <span className="text-gray-900 dark:text-white">35%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white">Filter Usage</span>
                <span className="text-sm text-green-600 dark:text-green-400">↗ 8%</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Most used: Team, Position, Fantasy Points
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white">Peak Search Times</span>
                <span className="text-sm text-blue-600 dark:text-blue-400">Live</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Sunday 1-4 PM EST, Tuesday 7-9 PM EST
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Smart Recommendations Component
const SmartRecommendations: React.FC = () => {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
          <Award className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Recommendations</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trending Players */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Trending Up
          </h3>
          <div className="space-y-3">
            {[
              { name: 'Tua Tagovailoa', position: 'QB', team: 'MIA', trend: '+15%' },
              { name: 'Breece Hall', position: 'RB', team: 'NYJ', trend: '+12%' },
              { name: 'Garrett Wilson', position: 'WR', team: 'NYJ', trend: '+8%' }
            ].map((player) => (
              <div key={player.name} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {player.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{player.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{player.position} - {player.team}</div>
                  </div>
                </div>
                <div className="text-green-600 dark:text-green-400 font-medium text-sm">
                  {player.trend}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Searches */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Recommended for You
          </h3>
          <div className="space-y-3">
            {[
              'Breakout candidates WR',
              'Handcuff RB sleepers',
              'Streaming QB week 1',
              'High-upside TE picks',
              'Defense vs weak offenses'
            ].map((search) => (
              <button
                key={search}
                className="w-full text-left p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
              >
                <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {search}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Based on your search history and league settings
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">AI Search Insights</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="font-medium text-gray-900 dark:text-white mb-1">Search Pattern</div>
            <div className="text-gray-600 dark:text-gray-400">You frequently search for QB + matchup analysis</div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="font-medium text-gray-900 dark:text-white mb-1">Opportunity</div>
            <div className="text-gray-600 dark:text-gray-400">Consider exploring TE streaming options</div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="font-medium text-gray-900 dark:text-white mb-1">Timing</div>
            <div className="text-gray-600 dark:text-gray-400">You search most actively on Tuesday evenings</div>
          </div>
        </div>
      </div>
    </div>
  );
};