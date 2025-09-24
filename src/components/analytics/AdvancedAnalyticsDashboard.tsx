import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Target,
  Trophy,
  AlertTriangle,
  Calendar,
  Users,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  Download,
  Info,
  Shield,
  Zap
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface TeamAnalytics {
  teamId: string;
  teamName: string;
  season: number;
  performanceMetrics: any;
  trendAnalysis: any;
  strengthsWeaknesses: any;
  projectedOutcome: any;
  historicalComparison: any;
  tradeImpact: any;
  scheduleAnalysis: any;
  rosterConstruction: any;
}

interface AdvancedAnalyticsDashboardProps {
  teamId: string;
  leagueId: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdvancedAnalyticsDashboard({ teamId, leagueId }: AdvancedAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [teamId]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics/team/${teamId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getGradeColor = (grade: string) => {
    const colors: { [key: string]: string } = {
      'A': 'bg-green-100 text-green-800',
      'B': 'bg-blue-100 text-blue-800',
      'C': 'bg-yellow-100 text-yellow-800',
      'D': 'bg-orange-100 text-orange-800',
      'F': 'bg-red-100 text-red-800'
    };
    return colors[grade] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading advanced analytics...</span>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error || 'No analytics data available'}</AlertDescription>
      </Alert>
    );
  }

  // Prepare chart data
  const performanceRadarData = [
    { metric: 'Power', value: analytics.performanceMetrics.powerRanking },
    { metric: 'Efficiency', value: analytics.performanceMetrics.efficiencyRating },
    { metric: 'Consistency', value: analytics.performanceMetrics.consistencyScore },
    { metric: 'Explosiveness', value: analytics.performanceMetrics.explosiveness },
    { metric: 'Clutch', value: analytics.performanceMetrics.clutchPerformance }
  ];

  const positionStrengthData = Object.entries(analytics.strengthsWeaknesses.positionAnalysis).map(
    ([position, data]: [string, any]) => ({
      position,
      rating: data.rating,
      depth: data.depth,
      upside: data.upside
    })
  );

  const weeklyTrendData = analytics.performanceMetrics.weeklyRankings.map((rank: number, week: number) => ({
    week: `W${week + 1}`,
    rank,
    projected: analytics.scheduleAnalysis.projectedPointsByWeek[week] || 0
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                {analytics.teamName} Analytics
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Advanced metrics and projections for {analytics.season} season
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchAnalytics}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Power Ranking</p>
                <p className="text-2xl font-bold">
                  #{Math.round(analytics.performanceMetrics.powerRanking)}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="mt-2">
              {getTrendIcon(analytics.trendAnalysis.momentum)}
              <span className="text-xs ml-1">{analytics.trendAnalysis.momentum}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Playoff Probability</p>
                <p className="text-2xl font-bold">
                  {analytics.projectedOutcome.playoffProbability.toFixed(1)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
            <Progress 
              value={analytics.projectedOutcome.playoffProbability} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Projected Record</p>
                <p className="text-2xl font-bold">
                  {analytics.projectedOutcome.projectedWins}-{analytics.projectedOutcome.projectedLosses}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              CI: {analytics.projectedOutcome.confidenceInterval.low}-{analytics.projectedOutcome.confidenceInterval.high} wins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Championship Odds</p>
                <p className="text-2xl font-bold">
                  {analytics.projectedOutcome.championshipProbability.toFixed(1)}%
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Rank #{analytics.projectedOutcome.projectedFinalRank}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="overview">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="strengths">Analysis</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Radar */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={performanceRadarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis domain={[0, 10]} />
                  <Radar 
                    name="Performance" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Position Strengths */}
          <Card>
            <CardHeader>
              <CardTitle>Position Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={positionStrengthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="position" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="rating" fill="#3b82f6" name="Rating" />
                  <Bar dataKey="depth" fill="#10b981" name="Depth" />
                  <Bar dataKey="upside" fill="#f59e0b" name="Upside" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analytics.strengthsWeaknesses.strengths.map((strength: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weaknesses</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analytics.strengthsWeaknesses.weaknesses.map((weakness: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-red-500 rounded-full" />
                      <span className="text-sm">{weakness}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Weekly Performance Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Season Trajectory</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="rank" 
                    stroke="#3b82f6" 
                    name="League Rank"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="#10b981" 
                    name="Projected Points"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trend Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Short Term (3 weeks)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getTrendIcon(analytics.trendAnalysis.shortTerm.direction)}
                  <span className="text-lg font-semibold">
                    {analytics.trendAnalysis.shortTerm.magnitude.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={analytics.trendAnalysis.shortTerm.confidence} 
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.trendAnalysis.shortTerm.confidence}% confidence
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Medium Term (6 weeks)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getTrendIcon(analytics.trendAnalysis.mediumTerm.direction)}
                  <span className="text-lg font-semibold">
                    {analytics.trendAnalysis.mediumTerm.magnitude.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={analytics.trendAnalysis.mediumTerm.confidence} 
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.trendAnalysis.mediumTerm.confidence}% confidence
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Season</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getTrendIcon(analytics.trendAnalysis.season.direction)}
                  <span className="text-lg font-semibold">
                    {analytics.trendAnalysis.season.magnitude.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={analytics.trendAnalysis.season.confidence} 
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.trendAnalysis.season.confidence}% confidence
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Momentum Indicator */}
          <Card>
            <CardHeader>
              <CardTitle>Current Momentum</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <div className={`text-4xl font-bold ${
                  analytics.trendAnalysis.momentum === 'rising' ? 'text-green-500' :
                  analytics.trendAnalysis.momentum === 'falling' ? 'text-red-500' :
                  'text-gray-500'
                }`}>
                  {analytics.trendAnalysis.momentum.toUpperCase()}
                </div>
              </div>
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={weeklyTrendData.slice(-5)}>
                    <Area 
                      type="monotone" 
                      dataKey="projected" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strengths" className="space-y-6">
          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Strategic Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.strengthsWeaknesses.recommendations.map((rec: string, idx: number) => (
                  <Alert key={idx}>
                    <Info className="h-4 w-4" />
                    <AlertDescription>{rec}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Roster Construction */}
          <Card>
            <CardHeader>
              <CardTitle>Roster Construction Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Star Power</p>
                  <Progress value={analytics.rosterConstruction.starPower * 10} className="mt-1" />
                  <p className="text-xs mt-1">{analytics.rosterConstruction.starPower}/10</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Depth</p>
                  <Progress value={analytics.rosterConstruction.depth * 10} className="mt-1" />
                  <p className="text-xs mt-1">{analytics.rosterConstruction.depth}/10</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Balance</p>
                  <Progress value={analytics.rosterConstruction.balance * 10} className="mt-1" />
                  <p className="text-xs mt-1">{analytics.rosterConstruction.balance}/10</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Injury Risk</p>
                  <Progress 
                    value={analytics.rosterConstruction.injuryRisk * 10} 
                    className="mt-1"
                  />
                  <p className="text-xs mt-1">{analytics.rosterConstruction.injuryRisk}/10</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Flex Strategy</span>
                  <Badge>{analytics.rosterConstruction.flexStrategy.replace('_', ' ')}</Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm">Average Age</span>
                  <span className="font-semibold">{analytics.rosterConstruction.age.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm">Bye Week Clustering</span>
                  <span className="font-semibold">{analytics.rosterConstruction.byeWeekConcentration.toFixed(1)}/10</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          {/* Schedule Difficulty */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Overall Strength</p>
                  <Progress 
                    value={analytics.scheduleAnalysis.strengthOfSchedule * 100} 
                    className="mt-1"
                  />
                  <p className="text-xs mt-1">
                    {(analytics.scheduleAnalysis.strengthOfSchedule * 100).toFixed(0)}% difficult
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Remaining Difficulty</p>
                  <Progress 
                    value={analytics.scheduleAnalysis.remainingDifficulty * 100} 
                    className="mt-1"
                  />
                  <p className="text-xs mt-1">
                    {(analytics.scheduleAnalysis.remainingDifficulty * 100).toFixed(0)}% difficult
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Playoff Difficulty</p>
                  <Progress 
                    value={analytics.scheduleAnalysis.playoffScheduleDifficulty * 100} 
                    className="mt-1"
                  />
                  <p className="text-xs mt-1">
                    {(analytics.scheduleAnalysis.playoffScheduleDifficulty * 100).toFixed(0)}% difficult
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Easiest Weeks</h4>
                  <div className="space-y-1">
                    {analytics.scheduleAnalysis.easiestWeeks.map((week: number) => (
                      <Badge key={week} variant="outline" className="mr-1">
                        Week {week}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Hardest Weeks</h4>
                  <div className="space-y-1">
                    {analytics.scheduleAnalysis.hardestWeeks.map((week: number) => (
                      <Badge key={week} variant="outline" className="mr-1 border-red-200">
                        Week {week}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Must Win Weeks</h4>
                  <div className="space-y-1">
                    {analytics.scheduleAnalysis.mustWinWeeks.map((week: number) => (
                      <Badge key={week} className="mr-1 bg-yellow-100 text-yellow-800">
                        Week {week}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades" className="space-y-6">
          {/* Trade Impact */}
          <Card>
            <CardHeader>
              <CardTitle>Trade Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Net Trade Impact</span>
                  <span className={`text-lg font-bold ${
                    analytics.tradeImpact.netImpact > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {analytics.tradeImpact.netImpact > 0 ? '+' : ''}{analytics.tradeImpact.netImpact.toFixed(1)}
                  </span>
                </div>
                <Progress 
                  value={50 + analytics.tradeImpact.netImpact * 5} 
                  className="h-3"
                />
              </div>

              {/* Recent Trades */}
              {analytics.tradeImpact.recentTrades.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Recent Trades</h4>
                  <div className="space-y-2">
                    {analytics.tradeImpact.recentTrades.map((trade: any) => (
                      <div key={trade.tradeId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">Trade #{trade.tradeId.slice(-6)}</p>
                          <p className="text-xs text-gray-600">
                            Impact: {trade.immediateImpact > 0 ? '+' : ''}{trade.immediateImpact.toFixed(1)}
                          </p>
                        </div>
                        <Badge className={getGradeColor(trade.grade)}>
                          Grade: {trade.grade}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trade Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Recommended Targets</h4>
                  <div className="space-y-2">
                    {analytics.tradeImpact.recommendedTargets.map((target: any) => (
                      <div key={target.playerId} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{target.playerName}</span>
                          <Badge variant="outline">{target.position}</Badge>
                        </div>
                        <p className="text-xs text-gray-600">{target.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Trade Away Candidates</h4>
                  <div className="space-y-2">
                    {analytics.tradeImpact.tradeAwayCandicates.map((candidate: any) => (
                      <div key={candidate.playerId} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{candidate.playerName}</span>
                          <Badge variant="outline">{candidate.position}</Badge>
                        </div>
                        <p className="text-xs text-gray-600">{candidate.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}