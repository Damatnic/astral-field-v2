import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, Avatar, Chip, Divider, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { showMessage } from 'react-native-flash-message';

import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import MatchupCard from '../components/MatchupCard';
import QuickStatsCard from '../components/QuickStatsCard';
import NotificationBadge from '../components/NotificationBadge';

interface DashboardData {
  upcomingMatchups: any[];
  recentActivity: any[];
  quickStats: {
    totalLeagues: number;
    activeTeams: number;
    weeklyRank: number;
    totalPoints: number;
  };
  notifications: any[];
  tradingBlock: any[];
  achievements: any[];
}

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const theme = useTheme();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const data = await dashboardService.getDashboardData();
      setDashboardData(data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  const handleMatchupPress = (matchup: any) => {
    navigation.navigate('MatchupDetail', { matchupId: matchup.id });
  };

  const handleLeaguePress = (leagueId: string, leagueName: string) => {
    navigation.navigate('LeagueDetail', { leagueId, leagueName });
  };

  const handleAnalyticsPress = () => {
    navigation.navigate('Analytics');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchDashboardData} />;
  }

  if (!dashboardData) {
    return <ErrorMessage message="No data available" onRetry={fetchDashboardData} />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header Section */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryContainer]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Avatar.Image 
              size={60} 
              source={{ uri: user?.image || 'https://via.placeholder.com/60' }} 
            />
            <View style={styles.userDetails}>
              <Title style={[styles.welcomeText, { color: theme.colors.onPrimary }]}>
                Welcome back, {user?.name?.split(' ')[0]}!
              </Title>
              <Paragraph style={[styles.dateText, { color: theme.colors.onPrimary }]}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Paragraph>
            </View>
          </View>
          <NotificationBadge 
            count={dashboardData.notifications.length} 
            onPress={handleNotificationPress}
          />
        </View>
      </LinearGradient>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>Quick Stats</Title>
        <View style={styles.statsGrid}>
          <QuickStatsCard
            icon="trophy-outline"
            label="Leagues"
            value={dashboardData.quickStats.totalLeagues}
            color={theme.colors.primary}
          />
          <QuickStatsCard
            icon="people-outline"
            label="Teams"
            value={dashboardData.quickStats.activeTeams}
            color={theme.colors.secondary}
          />
          <QuickStatsCard
            icon="trending-up-outline"
            label="Week Rank"
            value={`#${dashboardData.quickStats.weeklyRank}`}
            color={theme.colors.tertiary}
          />
          <QuickStatsCard
            icon="stats-chart-outline"
            label="Total Points"
            value={dashboardData.quickStats.totalPoints.toFixed(0)}
            color={theme.colors.error}
          />
        </View>
      </View>

      {/* Upcoming Matchups */}
      {dashboardData.upcomingMatchups.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>This Week's Matchups</Title>
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('Leagues')}
              labelStyle={{ fontSize: 12 }}
            >
              View All
            </Button>
          </View>
          {dashboardData.upcomingMatchups.slice(0, 3).map((matchup, index) => (
            <MatchupCard
              key={index}
              matchup={matchup}
              onPress={() => handleMatchupPress(matchup)}
              style={{ marginBottom: 12 }}
            />
          ))}
        </View>
      )}

      {/* Recent Activity */}
      {dashboardData.recentActivity.length > 0 && (
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Recent Activity</Title>
          <Card style={styles.activityCard}>
            <Card.Content>
              {dashboardData.recentActivity.slice(0, 5).map((activity, index) => (
                <View key={index}>
                  <View style={styles.activityItem}>
                    <Ionicons 
                      name={activity.icon || 'information-circle-outline'} 
                      size={20} 
                      color={theme.colors.primary} 
                    />
                    <View style={styles.activityContent}>
                      <Paragraph style={styles.activityText}>
                        {activity.description}
                      </Paragraph>
                      <Paragraph style={styles.activityTime}>
                        {activity.timeAgo}
                      </Paragraph>
                    </View>
                  </View>
                  {index < dashboardData.recentActivity.length - 1 && (
                    <Divider style={styles.activityDivider} />
                  )}
                </View>
              ))}
            </Card.Content>
          </Card>
        </View>
      )}

      {/* Trading Block */}
      {dashboardData.tradingBlock.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Active on Trading Block</Title>
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('Trades')}
              labelStyle={{ fontSize: 12 }}
            >
              Manage
            </Button>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dashboardData.tradingBlock.map((player, index) => (
              <Card key={index} style={styles.tradingBlockCard}>
                <Card.Content style={styles.tradingBlockContent}>
                  <Avatar.Image 
                    size={40} 
                    source={{ uri: player.image || 'https://via.placeholder.com/40' }} 
                  />
                  <Paragraph style={styles.playerName}>{player.name}</Paragraph>
                  <Chip size={16} textStyle={{ fontSize: 10 }}>
                    {player.position}
                  </Chip>
                </Card.Content>
              </Card>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent Achievements */}
      {dashboardData.achievements.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Recent Achievements</Title>
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('Achievements')}
              labelStyle={{ fontSize: 12 }}
            >
              View All
            </Button>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dashboardData.achievements.slice(0, 3).map((achievement, index) => (
              <Card key={index} style={styles.achievementCard}>
                <Card.Content style={styles.achievementContent}>
                  <View style={styles.achievementIcon}>
                    <Title>{achievement.icon}</Title>
                  </View>
                  <Paragraph style={styles.achievementName}>
                    {achievement.name}
                  </Paragraph>
                  <Chip 
                    size={14} 
                    textStyle={{ fontSize: 10 }}
                    style={{ backgroundColor: theme.colors.primaryContainer }}
                  >
                    +{achievement.points}
                  </Chip>
                </Card.Content>
              </Card>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>Quick Actions</Title>
        <View style={styles.quickActions}>
          <Button 
            mode="contained" 
            icon="stats-chart"
            onPress={handleAnalyticsPress}
            style={styles.actionButton}
            labelStyle={{ fontSize: 12 }}
          >
            Analytics
          </Button>
          <Button 
            mode="outlined" 
            icon="people"
            onPress={() => navigation.navigate('Leagues')}
            style={styles.actionButton}
            labelStyle={{ fontSize: 12 }}
          >
            My Teams
          </Button>
          <Button 
            mode="outlined" 
            icon="swap-horizontal"
            onPress={() => navigation.navigate('Trades')}
            style={styles.actionButton}
            labelStyle={{ fontSize: 12 }}
          >
            Trade Hub
          </Button>
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 15,
  },
  welcomeText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    opacity: 0.9,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  activityCard: {
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityContent: {
    marginLeft: 12,
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  activityDivider: {
    marginVertical: 8,
  },
  tradingBlockCard: {
    width: 120,
    marginRight: 12,
    elevation: 2,
  },
  tradingBlockContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  playerName: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 8,
  },
  achievementCard: {
    width: 140,
    marginRight: 12,
    elevation: 2,
  },
  achievementContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  achievementIcon: {
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 8,
  },
});

export default HomeScreen;