import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Shield, Target, Users, TrendingUp, Award, Lock, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  points: number;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  progressPercentage: number;
  maxProgress?: number;
  isSecret?: boolean;
}

interface UserBadge {
  id: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  icon: string;
  color: string;
  earned: boolean;
  earnedAt?: Date;
  featured: boolean;
  animationType?: string;
}

export default function AchievementDisplay() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [featuredBadges, setFeaturedBadges] = useState<UserBadge[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTier, setSelectedTier] = useState('all');
  const [showOnlyUnlocked, setShowOnlyUnlocked] = useState(false);
  const [editingFeatured, setEditingFeatured] = useState(false);
  const [selectedBadgesForFeature, setSelectedBadgesForFeature] = useState<string[]>([]);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const response = await fetch('/api/achievements/user-achievements');
      const data = await response.json();
      
      setAchievements(data.achievements);
      setBadges(data.badges);
      setFeaturedBadges(data.featuredBadges);
      setStats(data.stats);
      setSelectedBadgesForFeature(data.featuredBadges.map((b: UserBadge) => b.id));
    } catch (error) {
      console.error('Error fetching achievements:', error);
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const checkForNewAchievements = async () => {
    try {
      const response = await fetch('/api/achievements/user-achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' })
      });
      
      const data = await response.json();
      
      if (data.newAchievements.length > 0 || data.newBadges.length > 0) {
        toast.success(data.message);
        fetchAchievements();
      } else {
        toast.info('No new achievements to unlock');
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
      toast.error('Failed to check achievements');
    }
  };

  const updateFeaturedBadges = async () => {
    try {
      const response = await fetch('/api/achievements/user-achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'setFeaturedBadges',
          badgeIds: selectedBadgesForFeature
        })
      });
      
      if (response.ok) {
        toast.success('Featured badges updated');
        setEditingFeatured(false);
        fetchAchievements();
      }
    } catch (error) {
      console.error('Error updating featured badges:', error);
      toast.error('Failed to update featured badges');
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: JSX.Element } = {
      gameplay: <Trophy className="w-5 h-5" />,
      social: <Users className="w-5 h-5" />,
      trading: <TrendingUp className="w-5 h-5" />,
      drafting: <Target className="w-5 h-5" />,
      special: <Star className="w-5 h-5" />,
      milestone: <Award className="w-5 h-5" />
    };
    return icons[category] || <Shield className="w-5 h-5" />;
  };

  const getTierColor = (tier: string) => {
    const colors: { [key: string]: string } = {
      bronze: 'text-orange-600 border-orange-600',
      silver: 'text-gray-400 border-gray-400',
      gold: 'text-yellow-500 border-yellow-500',
      platinum: 'text-purple-400 border-purple-400',
      diamond: 'text-cyan-400 border-cyan-400'
    };
    return colors[tier] || 'text-gray-400 border-gray-400';
  };

  const getRarityColor = (rarity: string) => {
    const colors: { [key: string]: string } = {
      common: 'bg-gray-500',
      uncommon: 'bg-green-500',
      rare: 'bg-blue-500',
      epic: 'bg-purple-500',
      legendary: 'bg-orange-500'
    };
    return colors[rarity] || 'bg-gray-500';
  };

  const filteredAchievements = achievements.filter(achievement => {
    if (selectedCategory !== 'all' && achievement.category !== selectedCategory) return false;
    if (selectedTier !== 'all' && achievement.tier !== selectedTier) return false;
    if (showOnlyUnlocked && !achievement.unlocked) return false;
    return true;
  });

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">Achievements & Badges</CardTitle>
              <CardDescription>Track your progress and showcase your accomplishments</CardDescription>
            </div>
            <Button onClick={checkForNewAchievements} variant="outline">
              <CheckCircle className="mr-2 h-4 w-4" />
              Check Progress
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Achievement Score</p>
                    <p className="text-2xl font-bold">{stats?.score || 0}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completion</p>
                    <p className="text-2xl font-bold">{Math.round(stats?.completionPercentage || 0)}%</p>
                  </div>
                  <Progress value={stats?.completionPercentage || 0} className="w-20" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Badges</p>
                    <p className="text-2xl font-bold">{stats?.earnedBadges || 0}/{stats?.totalBadges || 0}</p>
                  </div>
                  <Shield className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {featuredBadges.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Featured Badges</CardTitle>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setEditingFeatured(!editingFeatured)}
                  >
                    {editingFeatured ? 'Cancel' : 'Edit'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {editingFeatured ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {badges.filter(b => b.earned).map(badge => (
                        <div
                          key={badge.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedBadgesForFeature.includes(badge.id) 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => {
                            if (selectedBadgesForFeature.includes(badge.id)) {
                              setSelectedBadgesForFeature(prev => prev.filter(id => id !== badge.id));
                            } else if (selectedBadgesForFeature.length < 3) {
                              setSelectedBadgesForFeature(prev => [...prev, badge.id]);
                            } else {
                              toast.error('Maximum 3 badges can be featured');
                            }
                          }}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-1">{badge.icon}</div>
                            <p className="text-xs font-medium">{badge.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button 
                      onClick={updateFeaturedBadges}
                      disabled={selectedBadgesForFeature.length === 0}
                      className="w-full"
                    >
                      Save Featured Badges
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-6">
                    {featuredBadges.map(badge => (
                      <motion.div
                        key={badge.id}
                        className="relative"
                        whileHover={{ scale: 1.1 }}
                        animate={
                          badge.animationType === 'glow' ? { boxShadow: ['0 0 20px rgba(147, 51, 234, 0.5)', '0 0 40px rgba(147, 51, 234, 0.8)', '0 0 20px rgba(147, 51, 234, 0.5)'] } :
                          badge.animationType === 'sparkle' ? { rotate: [0, 5, -5, 0] } :
                          badge.animationType === 'rotate' ? { rotate: 360 } :
                          badge.animationType === 'pulse' ? { scale: [1, 1.1, 1] } :
                          {}
                        }
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <div 
                          className="w-20 h-20 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: badge.color }}
                        >
                          <span className="text-3xl">{badge.icon}</span>
                        </div>
                        <p className="text-center mt-2 text-sm font-medium">{badge.name}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="achievements" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="badges">Badges</TabsTrigger>
            </TabsList>

            <TabsContent value="achievements">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-1 border rounded-md"
                    >
                      <option value="all">All Categories</option>
                      <option value="gameplay">Gameplay</option>
                      <option value="social">Social</option>
                      <option value="trading">Trading</option>
                      <option value="drafting">Drafting</option>
                      <option value="special">Special</option>
                      <option value="milestone">Milestone</option>
                    </select>

                    <select
                      value={selectedTier}
                      onChange={(e) => setSelectedTier(e.target.value)}
                      className="px-3 py-1 border rounded-md"
                    >
                      <option value="all">All Tiers</option>
                      <option value="bronze">Bronze</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                      <option value="diamond">Diamond</option>
                    </select>

                    <Button
                      variant={showOnlyUnlocked ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setShowOnlyUnlocked(!showOnlyUnlocked)}
                    >
                      {showOnlyUnlocked ? 'Show All' : 'Show Unlocked'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence>
                      {filteredAchievements.map(achievement => (
                        <motion.div
                          key={achievement.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          <Card className={`relative overflow-hidden ${
                            !achievement.unlocked ? 'opacity-60' : ''
                          }`}>
                            {achievement.unlocked && (
                              <div className="absolute top-2 right-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              </div>
                            )}
                            {achievement.isSecret && !achievement.unlocked && (
                              <div className="absolute top-2 right-2">
                                <Lock className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="text-3xl flex-shrink-0">
                                  {achievement.isSecret && !achievement.unlocked ? '❓' : achievement.icon}
                                </div>
                                <div className="flex-grow">
                                  <h3 className="font-semibold text-lg">
                                    {achievement.isSecret && !achievement.unlocked ? '???' : achievement.name}
                                  </h3>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {achievement.isSecret && !achievement.unlocked ? 'Hidden achievement' : achievement.description}
                                  </p>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className={getTierColor(achievement.tier)}>
                                      {achievement.tier}
                                    </Badge>
                                    <div className="flex items-center gap-1">
                                      {getCategoryIcon(achievement.category)}
                                      <span className="text-xs text-muted-foreground">{achievement.category}</span>
                                    </div>
                                    <Badge variant="secondary">
                                      {achievement.points} pts
                                    </Badge>
                                  </div>
                                  {achievement.maxProgress && !achievement.unlocked && (
                                    <div className="mt-2">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span>Progress</span>
                                        <span>{achievement.progress}/{achievement.maxProgress}</span>
                                      </div>
                                      <Progress value={achievement.progressPercentage} className="h-2" />
                                    </div>
                                  )}
                                  {achievement.unlocked && achievement.unlockedAt && (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span>Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="badges">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {badges.map(badge => (
                      <motion.div
                        key={badge.id}
                        whileHover={{ scale: 1.05 }}
                        className={`relative ${!badge.earned ? 'opacity-50' : ''}`}
                      >
                        <Card className="text-center p-4">
                          <div 
                            className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2 ${
                              badge.earned ? '' : 'grayscale'
                            }`}
                            style={{ backgroundColor: badge.earned ? badge.color : '#6B7280' }}
                          >
                            <span className="text-2xl">{badge.icon}</span>
                          </div>
                          <h4 className="font-semibold text-sm">{badge.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                          <Badge 
                            variant="secondary" 
                            className={`mt-2 ${getRarityColor(badge.rarity)} text-white`}
                          >
                            {badge.rarity}
                          </Badge>
                          {badge.earned && badge.earnedAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(badge.earnedAt).toLocaleDateString()}
                            </p>
                          )}
                          {!badge.earned && (
                            <Lock className="absolute top-2 right-2 h-4 w-4 text-gray-400" />
                          )}
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {stats?.nextMilestone && (
            <Card className="mt-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Next Milestone</p>
                    <p className="font-semibold">{stats.nextMilestone}</p>
                  </div>
                  <Target className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}