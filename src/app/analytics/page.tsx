'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Trophy, Users, Target, Activity } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-4xl font-bold text-slate-900">League Analytics</h1>
          </div>
          <p className="text-xl text-slate-600">
            Deep insights and performance analytics for the D'Amato Dynasty League
          </p>
        </div>

        {/* Coming Soon Notice */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-8 text-center">
            <Activity className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Advanced Analytics Coming Soon</h2>
            <p className="text-lg text-slate-700 mb-6">
              We're building powerful analytics tools including performance tracking, 
              trend analysis, and dynasty value insights.
            </p>
            <Badge className="bg-blue-600 text-white">
              <TrendingUp className="h-4 w-4 mr-2" />
              In Development
            </Badge>
          </CardContent>
        </Card>

        {/* Preview Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Track team and player performance across seasons with detailed statistics and trends.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-green-600" />
                Dynasty Values
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Monitor long-term player values and make informed dynasty league decisions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-purple-600" />
                League Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Analyze league-wide trends, trade patterns, and competitive balance.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}