/**
 * Analytics Navigation Component
 * Provides access to both basic and advanced Vortex analytics
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  Brain, 
  TrendingUp, 
  Zap, 
  Target,
  Users,
  Activity,
  LineChart,
  PieChart,
  Settings
} from 'lucide-react';

const AnalyticsNavigation: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🏈 Fantasy Analytics Hub
          </h1>
          <p className="text-xl text-slate-300 mb-8">
            Choose your analytics experience - from basic insights to elite-level intelligence
          </p>
        </div>

        {/* Analytics Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Basic Analytics */}
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-white">Basic Analytics</CardTitle>
              <CardDescription className="text-slate-400">
                Essential team performance metrics and player insights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-slate-300">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span>Team performance tracking</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-300">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span>Player statistics and trends</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-300">
                  <PieChart className="w-5 h-5 text-purple-400" />
                  <span>League standings and rankings</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-300">
                  <Target className="w-5 h-5 text-orange-400" />
                  <span>Matchup analysis</span>
                </div>
              </div>
              
              <div className="pt-4">
                <Link href="/analytics">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3">
                    View Basic Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Vortex Analytics */}
          <Card className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 blur-xl" />
            <CardHeader className="text-center pb-6 relative z-10">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-white flex items-center justify-center space-x-2">
                <span>⚡ Vortex Analytics</span>
                <span className="text-xs bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-2 py-1 rounded-full font-bold">
                  ELITE
                </span>
              </CardTitle>
              <CardDescription className="text-purple-200">
                Advanced AI-powered insights with real-time data processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-purple-200">
                  <Brain className="w-5 h-5 text-pink-400" />
                  <span>AI-powered recommendations</span>
                </div>
                <div className="flex items-center space-x-3 text-purple-200">
                  <Activity className="w-5 h-5 text-green-400" />
                  <span>Real-time scoring updates</span>
                </div>
                <div className="flex items-center space-x-3 text-purple-200">
                  <LineChart className="w-5 h-5 text-blue-400" />
                  <span>Advanced trend analysis</span>
                </div>
                <div className="flex items-center space-x-3 text-purple-200">
                  <Target className="w-5 h-5 text-orange-400" />
                  <span>Waiver wire intelligence</span>
                </div>
                <div className="flex items-center space-x-3 text-purple-200">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                  <span>Trade impact analysis</span>
                </div>
                <div className="flex items-center space-x-3 text-purple-200">
                  <Settings className="w-5 h-5 text-purple-400" />
                  <span>Customizable dashboards</span>
                </div>
              </div>
              
              <div className="pt-4">
                <Link href="/analytics/vortex">
                  <Button className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 hover:from-purple-600 hover:via-pink-600 hover:to-blue-600 text-white font-semibold py-3 shadow-lg">
                    Launch Vortex Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Comparison */}
        <Card className="bg-slate-800/30 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-center">Feature Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-3 px-4 text-slate-300">Feature</th>
                    <th className="text-center py-3 px-4 text-slate-300">Basic Analytics</th>
                    <th className="text-center py-3 px-4 text-slate-300">⚡ Vortex Analytics</th>
                  </tr>
                </thead>
                <tbody className="text-slate-400">
                  <tr className="border-b border-slate-700">
                    <td className="py-3 px-4">Player Performance Tracking</td>
                    <td className="text-center py-3 px-4">✅</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-3 px-4">Team Statistics</td>
                    <td className="text-center py-3 px-4">✅</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-3 px-4">Real-time Updates</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-3 px-4">AI Insights & Recommendations</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-3 px-4">Advanced Trend Analysis</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-3 px-4">Waiver Wire Intelligence</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-3 px-4">Trade Impact Analysis</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-3 px-4">Interactive Visualizations</td>
                    <td className="text-center py-3 px-4">Basic</td>
                    <td className="text-center py-3 px-4">Advanced</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-3 px-4">Matchup Predictions</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Player Consistency Metrics</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="mt-12 text-center">
          <h3 className="text-white text-xl font-semibold mb-6">Quick Access</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/team">
              <Button variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700">
                My Team
              </Button>
            </Link>
            <Link href="/players">
              <Button variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700">
                Player Research
              </Button>
            </Link>
            <Link href="/ai-coach">
              <Button variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700">
                AI Coach
              </Button>
            </Link>
            <Link href="/live">
              <Button variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700">
                Live Scoring
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsNavigation;