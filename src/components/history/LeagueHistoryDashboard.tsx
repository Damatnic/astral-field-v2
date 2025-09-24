import React, { useState, useEffect } from 'react';
import { Trophy, Award, TrendingUp, Users, Calendar, Star, Medal, Crown, Flame, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface LeagueHistoryProps {
  leagueId: string;
}

export default function LeagueHistoryDashboard({ leagueId }: LeagueHistoryProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [seasonSummaries, setSeasonSummaries] = useState<any[]>([]);
  const [hallOfFame, setHallOfFame] = useState<any[]>([]);
  const [teamHistories, setTeamHistories] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => {
    fetchHistoryData();
  }, [leagueId]);

  const fetchHistoryData = async () => {
    try {
      const [recordsRes, seasonsRes, hofRes, teamsRes, timelineRes] = await Promise.all([
        fetch(`/api/history/records?leagueId=${leagueId}`),
        fetch(`/api/history/seasons?leagueId=${leagueId}`),
        fetch(`/api/history/hall-of-fame?leagueId=${leagueId}`),
        fetch(`/api/history/teams?leagueId=${leagueId}`),
        fetch(`/api/history/timeline?leagueId=${leagueId}`)
      ]);

      const [recordsData, seasonsData, hofData, teamsData, timelineData] = await Promise.all([
        recordsRes.json(),
        seasonsRes.json(),
        hofRes.json(),
        teamsRes.json(),
        timelineRes.json()
      ]);

      setRecords(recordsData);
      setSeasonSummaries(seasonsData);
      setHallOfFame(hofData);
      setTeamHistories(teamsData);
      setTimeline(timelineData);
    } catch (error) {
      console.error('Error fetching history data:', error);
      toast.error('Failed to load league history');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: JSX.Element } = {
      single_game: <Target className="w-4 h-4" />,
      weekly: <Calendar className="w-4 h-4" />,
      season: <Trophy className="w-4 h-4" />,
      playoff: <Crown className="w-4 h-4" />,
      all_time: <Star className="w-4 h-4" />
    };
    return icons[category] || <Award className="w-4 h-4" />;
  };

  const formatRecordValue = (type: string, value: number): string => {
    if (type.includes('points') || type.includes('score')) {
      return `${value.toFixed(2)} pts`;
    }
    if (type.includes('percentage')) {
      return `${value.toFixed(1)}%`;
    }
    if (type.includes('streak')) {
      return `${value} games`;
    }
    return value.toString();
  };

  const filteredRecords = records.filter(record => 
    selectedCategory === 'all' || record.category === selectedCategory
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            League History & Records
          </CardTitle>
          <CardDescription>Explore the rich history of your league</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="records" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="records">Records</TabsTrigger>
              <TabsTrigger value="seasons">Seasons</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="hof">Hall of Fame</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="records" className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border rounded-md"
                >
                  <option value="all">All Records</option>
                  <option value="single_game">Single Game</option>
                  <option value="weekly">Weekly</option>
                  <option value="season">Season</option>
                  <option value="playoff">Playoff</option>
                  <option value="all_time">All-Time</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filteredRecords.map((record, index) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(record.category)}
                              <Badge variant="outline">{record.category}</Badge>
                            </div>
                            {record.setDate && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(record.setDate).getFullYear()}
                              </span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <h4 className="font-semibold text-sm mb-2">{record.recordType}</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-primary">
                                {formatRecordValue(record.recordType, record.value)}
                              </span>
                            </div>
                            <div className="text-sm">
                              <p className="font-medium">{record.holderName}</p>
                              {record.holderTeamName && (
                                <p className="text-muted-foreground">{record.holderTeamName}</p>
                              )}
                            </div>
                            {record.previousHolderId && (
                              <div className="text-xs text-muted-foreground pt-2 border-t">
                                Previous: {formatRecordValue(record.recordType, record.previousValue || 0)}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </TabsContent>

            <TabsContent value="seasons" className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="px-4 py-2 border rounded-md"
                >
                  {seasonSummaries.map(season => (
                    <option key={season.season} value={season.season}>
                      {season.season} Season
                    </option>
                  ))}
                </select>
              </div>

              {seasonSummaries
                .filter(s => s.season === selectedSeason)
                .map(season => (
                  <div key={season.season} className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Crown className="h-6 w-6 text-yellow-500" />
                          {season.season} Season Champion
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-2xl font-bold mb-2">{season.championName}</h3>
                            <p className="text-muted-foreground mb-4">
                              Defeated {season.runnerUpName} in the Championship
                            </p>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Regular Season Winner:</span>
                                <span className="font-medium">{season.regularSeasonWinnerName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Points Scored:</span>
                                <span className="font-medium">{season.totalPoints.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Games Played:</span>
                                <span className="font-medium">{season.totalGames}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">
                                Highest Score
                              </h4>
                              <p className="text-2xl font-bold">{season.highestScore.toFixed(2)}</p>
                            </div>
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">
                                Lowest Score
                              </h4>
                              <p className="text-2xl font-bold">{season.lowestScore.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Closest Game</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">Week {season.closestGame.week}</p>
                          <p className="text-xl font-bold">{season.closestGame.margin.toFixed(2)} pts</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Biggest Blowout</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">Week {season.biggestBlowout.week}</p>
                          <p className="text-xl font-bold">{season.biggestBlowout.margin.toFixed(2)} pts</p>
                        </CardContent>
                      </Card>
                    </div>

                    {season.awards.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Season Awards</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {season.awards.map((award: any) => (
                              <div key={award.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                <Medal className="h-8 w-8 text-yellow-500" />
                                <div>
                                  <p className="font-semibold">{award.name}</p>
                                  <p className="text-sm text-muted-foreground">{award.recipientName}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))}
            </TabsContent>

            <TabsContent value="teams" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamHistories.map(team => (
                  <Card key={team.teamId} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{team.teamName}</CardTitle>
                      <CardDescription>{team.ownerName}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Championships</span>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: team.championships }).map((_, i) => (
                              <Trophy key={i} className="h-4 w-4 text-yellow-500" />
                            ))}
                            <span className="font-bold">{team.championships}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>All-Time Record</span>
                            <span className="font-medium">
                              {team.allTimeWins}-{team.allTimeLosses}
                              {team.allTimeTies > 0 && `-${team.allTimeTies}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Win Percentage</span>
                            <span className="font-medium">{team.winPercentage.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Playoff Appearances</span>
                            <span className="font-medium">{team.playoffAppearances}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Points For</span>
                            <span className="font-medium">{team.allTimePointsFor.toFixed(0)}</span>
                          </div>
                        </div>

                        {team.bestSeason && (
                          <div className="pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-1">Best Season</p>
                            <p className="text-sm font-medium">
                              {team.bestSeason.season}: {team.bestSeason.wins}-{team.bestSeason.losses}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="hof" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-6 w-6 text-yellow-500" />
                    Hall of Fame Inductees
                  </CardTitle>
                  <CardDescription>
                    The greatest contributors to league history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {hallOfFame.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No Hall of Fame inductees yet
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {hallOfFame.map(inductee => (
                        <motion.div
                          key={inductee.id}
                          whileHover={{ scale: 1.02 }}
                          className="p-6 border rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-bold">{inductee.inducteeName}</h3>
                              <p className="text-sm text-muted-foreground">
                                Class of {inductee.inductionYear}
                              </p>
                            </div>
                            <Badge variant="default" className="bg-yellow-600">
                              {inductee.category}
                            </Badge>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Championships:</span>
                                <span className="ml-2 font-bold">{inductee.stats.championships}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Win %:</span>
                                <span className="ml-2 font-bold">
                                  {inductee.stats.winPercentage.toFixed(1)}%
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Playoffs:</span>
                                <span className="ml-2 font-bold">{inductee.stats.playoffAppearances}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Records:</span>
                                <span className="ml-2 font-bold">{inductee.stats.records}</span>
                              </div>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <p className="text-sm italic text-muted-foreground">"{inductee.citation}"</p>
                          </div>

                          {inductee.achievements.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {inductee.achievements.slice(0, 3).map((achievement, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {achievement}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>League Timeline</CardTitle>
                  <CardDescription>Major events in league history</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="relative">
                      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border"></div>
                      
                      {timeline.map((event, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative flex items-start mb-8"
                        >
                          <div className={`absolute left-6 w-4 h-4 rounded-full border-2 border-background ${
                            event.type === 'championship' ? 'bg-yellow-500' :
                            event.impact === 'high' ? 'bg-red-500' :
                            event.impact === 'medium' ? 'bg-blue-500' :
                            'bg-gray-400'
                          }`}></div>
                          
                          <div className="ml-16 flex-grow">
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-semibold">{event.title}</h4>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(event.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{event.description}</p>
                                {event.participants && event.participants.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {event.participants.slice(0, 3).map((participant: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {participant}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}