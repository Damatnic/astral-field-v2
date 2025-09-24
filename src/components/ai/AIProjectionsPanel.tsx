import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Zap,
  Shield,
  Shuffle,
  Info,
  RefreshCw,
  Download,
  Star
} from 'lucide-react';

interface PlayerProjection {
  playerId: string;
  week: number;
  projectedPoints: number;
  confidence: number;
  factors: {
    recentPerformance: number;
    matchupDifficulty: number;
    homeAwayFactor: number;
    weatherImpact: number;
    injuryStatus: number;
    restDays: number;
    historicalTrends: number;
    teamGameScript: number;
    redZoneOpportunities: number;
    snapCountTrend: number;
  };
  insights: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: 'start' | 'sit' | 'flex' | 'bench';
}

interface OptimizedLineup {
  QB: string[];
  RB: string[];
  WR: string[];
  TE: string[];
  FLEX: string[];
  K: string[];
  DEF: string[];
  bench: string[];
  totalProjectedPoints: number;
  confidence: number;
  insights: string[];
}

interface AIProjectionsPanelProps {
  teamId: string;
  week: number;
  season: number;
}

export default function AIProjectionsPanel({ teamId, week, season }: AIProjectionsPanelProps) {
  const [activeTab, setActiveTab] = useState('projections');
  const [strategy, setStrategy] = useState<'balanced' | 'high_ceiling' | 'high_floor' | 'contrarian'>('balanced');
  const [optimizedLineup, setOptimizedLineup] = useState<OptimizedLineup | null>(null);
  const [playerProjections, setPlayerProjections] = useState<Map<string, PlayerProjection>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teamId) {
      fetchProjections();
    }
  }, [teamId, week, season]);

  const fetchProjections = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch team roster first
      const rosterResponse = await fetch(`/api/teams/${teamId}/roster`);
      const rosterData = await rosterResponse.json();

      if (!rosterResponse.ok) {
        throw new Error(rosterData.error || 'Failed to fetch roster');
      }

      // Fetch projections for each player
      const projectionPromises = rosterData.roster.map(async (player: any) => {
        const response = await fetch(`/api/ai/projections/${player.playerId}?week=${week}&season=${season}`);
        const data = await response.json();
        return data.projection;
      });

      const projections = await Promise.all(projectionPromises);
      const projectionsMap = new Map(projections.map(p => [p.playerId, p]));
      setPlayerProjections(projectionsMap);

    } catch (err) {
      console.error('Error fetching projections:', err);
      setError('Failed to load AI projections');
    } finally {
      setIsLoading(false);
    }
  };

  const optimizeLineup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/projections/lineup-optimizer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          week,
          season,
          strategy
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to optimize lineup');
      }

      setOptimizedLineup(data.optimizedLineup);
      setActiveTab('optimizer');

    } catch (err) {
      console.error('Error optimizing lineup:', err);
      setError('Failed to optimize lineup');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High Risk</Badge>;
      default:
        return null;
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'start':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'flex':
        return <Target className="h-5 w-5 text-blue-500" />;
      case 'sit':
      case 'bench':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStrategyIcon = (strat: string) => {
    switch (strat) {
      case 'balanced':
        return <Target className="h-4 w-4" />;
      case 'high_ceiling':
        return <TrendingUp className="h-4 w-4" />;
      case 'high_floor':
        return <Shield className="h-4 w-4" />;
      case 'contrarian':
        return <Shuffle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const renderProjectionCard = (projection: PlayerProjection) => {
    return (
      <Card key={projection.playerId} className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 rounded-full p-2">
                <Brain className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold">Player Name</h4>
                <p className="text-sm text-gray-600">Position • Team</p>
              </div>
            </div>
            {getRecommendationIcon(projection.recommendation)}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Projected Points</p>
              <p className="text-2xl font-bold text-blue-600">{projection.projectedPoints}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Confidence</p>
              <div className="flex items-center gap-2">
                <Progress value={projection.confidence} className="flex-1" />
                <span className="text-sm font-medium">{projection.confidence}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            {getRiskBadge(projection.riskLevel)}
            <Badge variant="outline" className="text-xs">
              {projection.recommendation.toUpperCase()}
            </Badge>
          </div>

          <div className="space-y-2">
            {projection.insights.slice(0, 3).map((insight, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <Info className="h-4 w-4 text-gray-400 mt-0.5" />
                <span className="text-gray-600">{insight}</span>
              </div>
            ))}
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:underline">
              View Projection Factors
            </summary>
            <div className="mt-3 space-y-2">
              {Object.entries(projection.factors).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{formatFactorName(key)}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={value * 100} className="w-20" />
                    <span className="text-xs font-medium w-10">{(value * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </CardContent>
      </Card>
    );
  };

  const formatFactorName = (factor: string): string => {
    return factor.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mr-2" />
            <span>Generating AI projections...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI-Powered Projections
          </CardTitle>
          <p className="text-sm text-gray-600">
            Advanced machine learning analysis for Week {week}
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="projections">
            <TabsList className="mb-4">
              <TabsTrigger value="projections">Player Projections</TabsTrigger>
              <TabsTrigger value="optimizer">Lineup Optimizer</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="projections" className="space-y-4">
              {error && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {playerProjections.size === 0 ? (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No projections available yet</p>
                  <Button onClick={fetchProjections} className="mt-4">
                    Generate Projections
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from(playerProjections.values()).map(projection => 
                    renderProjectionCard(projection)
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="optimizer" className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Lineup Optimization Strategy</h3>
                  <p className="text-sm text-gray-600">
                    Choose your optimization approach based on your league needs
                  </p>
                </div>
                <div className="flex gap-2">
                  <Select value={strategy} onValueChange={(value: any) => setStrategy(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balanced">
                        <div className="flex items-center gap-2">
                          {getStrategyIcon('balanced')}
                          Balanced
                        </div>
                      </SelectItem>
                      <SelectItem value="high_ceiling">
                        <div className="flex items-center gap-2">
                          {getStrategyIcon('high_ceiling')}
                          High Ceiling
                        </div>
                      </SelectItem>
                      <SelectItem value="high_floor">
                        <div className="flex items-center gap-2">
                          {getStrategyIcon('high_floor')}
                          High Floor
                        </div>
                      </SelectItem>
                      <SelectItem value="contrarian">
                        <div className="flex items-center gap-2">
                          {getStrategyIcon('contrarian')}
                          Contrarian
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={optimizeLineup}>
                    <Zap className="h-4 w-4 mr-2" />
                    Optimize
                  </Button>
                </div>
              </div>

              {optimizedLineup && (
                <div className="space-y-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Projected Points</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {optimizedLineup.totalProjectedPoints}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Confidence</p>
                          <p className="text-2xl font-bold">{optimizedLineup.confidence}%</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {optimizedLineup.insights.map((insight, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span>{insight}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(optimizedLineup).map(([position, playerIds]) => {
                      if (['totalProjectedPoints', 'confidence', 'insights'].includes(position)) return null;
                      
                      return (
                        <Card key={position}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">{position}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {(playerIds as string[]).length > 0 ? (
                              <ul className="space-y-1">
                                {(playerIds as string[]).map(playerId => (
                                  <li key={playerId} className="text-sm">
                                    Player {playerId.slice(-4)}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-500">Empty</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Top Performers This Week
                    </h4>
                    <p className="text-sm text-gray-600">
                      Based on matchups and recent trends, your top projected scorers are positioned for success.
                    </p>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Risk Assessment
                    </h4>
                    <p className="text-sm text-gray-600">
                      Monitor injury reports for questionable players. Weather conditions may impact outdoor games.
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Recommended Actions
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Review and apply optimized lineup before lock</li>
                      <li>• Check Sunday morning injury reports</li>
                      <li>• Consider weather impacts for outdoor games</li>
                      <li>• Monitor late-breaking news before kickoff</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}