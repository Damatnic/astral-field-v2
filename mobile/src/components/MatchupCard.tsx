import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Avatar, Chip, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface MatchupCardProps {
  matchup: {
    id: string;
    week: number;
    homeTeam: {
      id: string;
      name: string;
      logo?: string;
      record: string;
      projection: number;
    };
    awayTeam: {
      id: string;
      name: string;
      logo?: string;
      record: string;
      projection: number;
    };
    isLive?: boolean;
    homeScore?: number;
    awayScore?: number;
    gameTime?: string;
    status: 'upcoming' | 'live' | 'completed';
  };
  onPress: () => void;
  style?: any;
}

const MatchupCard: React.FC<MatchupCardProps> = ({ matchup, onPress, style }) => {
  const theme = useTheme();

  const getStatusColor = () => {
    switch (matchup.status) {
      case 'live':
        return '#FF6B6B';
      case 'completed':
        return theme.colors.outline;
      default:
        return theme.colors.primary;
    }
  };

  const getStatusText = () => {
    switch (matchup.status) {
      case 'live':
        return 'LIVE';
      case 'completed':
        return 'FINAL';
      default:
        return `Week ${matchup.week}`;
    }
  };

  const renderTeam = (team: any, isHome: boolean) => (
    <View style={[styles.teamContainer, isHome && styles.homeTeam]}>
      <Avatar.Image 
        size={40} 
        source={{ uri: team.logo || 'https://via.placeholder.com/40' }} 
      />
      <View style={styles.teamInfo}>
        <Title style={styles.teamName} numberOfLines={1}>
          {team.name}
        </Title>
        <Paragraph style={styles.teamRecord}>
          {team.record}
        </Paragraph>
      </View>
      <View style={styles.scoreContainer}>
        {matchup.status === 'completed' || matchup.status === 'live' ? (
          <Title style={[styles.score, { color: getStatusColor() }]}>
            {isHome ? matchup.homeScore?.toFixed(1) : matchup.awayScore?.toFixed(1)}
          </Title>
        ) : (
          <Paragraph style={styles.projection}>
            {team.projection.toFixed(1)}
          </Paragraph>
        )}
      </View>
    </View>
  );

  return (
    <TouchableOpacity onPress={onPress} style={style}>
      <Card style={[styles.card, { elevation: 3 }]}>
        {matchup.status === 'live' && (
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            style={styles.liveIndicator}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.liveContent}>
              <Ionicons name="radio" size={12} color="white" />
              <Paragraph style={styles.liveText}>LIVE</Paragraph>
            </View>
          </LinearGradient>
        )}
        
        <Card.Content style={styles.content}>
          <View style={styles.header}>
            <Chip 
              style={[styles.statusChip, { backgroundColor: `${getStatusColor()}20` }]}
              textStyle={{ color: getStatusColor(), fontSize: 11 }}
            >
              {getStatusText()}
            </Chip>
            {matchup.gameTime && matchup.status === 'upcoming' && (
              <Paragraph style={styles.gameTime}>
                {matchup.gameTime}
              </Paragraph>
            )}
          </View>

          <View style={styles.matchupContainer}>
            {renderTeam(matchup.awayTeam, false)}
            
            <View style={styles.vsContainer}>
              {matchup.status === 'upcoming' ? (
                <Paragraph style={styles.vsText}>VS</Paragraph>
              ) : (
                <Paragraph style={styles.vsText}>-</Paragraph>
              )}
            </View>
            
            {renderTeam(matchup.homeTeam, true)}
          </View>

          {matchup.status === 'upcoming' && (
            <View style={styles.footer}>
              <View style={styles.projectionComparison}>
                <Ionicons 
                  name="trending-up" 
                  size={14} 
                  color={theme.colors.primary} 
                />
                <Paragraph style={styles.projectionText}>
                  Projected: {Math.abs(matchup.homeTeam.projection - matchup.awayTeam.projection).toFixed(1)} pt spread
                </Paragraph>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  liveIndicator: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  liveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveText: {
    color: 'white',
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    marginLeft: 4,
  },
  content: {
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusChip: {
    height: 28,
  },
  gameTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  matchupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeTeam: {
    flexDirection: 'row-reverse',
  },
  teamInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  teamName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  teamRecord: {
    fontSize: 11,
    opacity: 0.7,
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  score: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  projection: {
    fontSize: 14,
    opacity: 0.8,
  },
  vsContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  vsText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    opacity: 0.5,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  projectionComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectionText: {
    fontSize: 11,
    marginLeft: 4,
    opacity: 0.7,
  },
});

export default MatchupCard;