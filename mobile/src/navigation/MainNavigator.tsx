import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Screens
import HomeScreen from '../screens/HomeScreen';
import LeaguesScreen from '../screens/LeaguesScreen';
import PlayersScreen from '../screens/PlayersScreen';
import TradesScreen from '../screens/TradesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LeagueDetailScreen from '../screens/LeagueDetailScreen';
import TeamDetailScreen from '../screens/TeamDetailScreen';
import PlayerDetailScreen from '../screens/PlayerDetailScreen';
import MatchupDetailScreen from '../screens/MatchupDetailScreen';
import LineupScreen from '../screens/LineupScreen';
import WaiverWireScreen from '../screens/WaiverWireScreen';
import TradeDetailScreen from '../screens/TradeDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import DraftScreen from '../screens/DraftScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeStackNavigator = () => {
  const theme = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontFamily: 'Inter-SemiBold',
        },
      }}
    >
      <Stack.Screen 
        name="HomeMain" 
        component={HomeScreen} 
        options={{ title: 'Dashboard' }} 
      />
      <Stack.Screen 
        name="LeagueDetail" 
        component={LeagueDetailScreen}
        options={({ route }) => ({ title: route.params?.leagueName || 'League' })}
      />
      <Stack.Screen 
        name="TeamDetail" 
        component={TeamDetailScreen}
        options={({ route }) => ({ title: route.params?.teamName || 'Team' })}
      />
      <Stack.Screen 
        name="MatchupDetail" 
        component={MatchupDetailScreen}
        options={{ title: 'Matchup' }}
      />
      <Stack.Screen 
        name="Lineup" 
        component={LineupScreen}
        options={{ title: 'Set Lineup' }}
      />
      <Stack.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Stack.Screen 
        name="Draft" 
        component={DraftScreen}
        options={{ title: 'Draft Room' }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
    </Stack.Navigator>
  );
};

const LeaguesStackNavigator = () => {
  const theme = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontFamily: 'Inter-SemiBold',
        },
      }}
    >
      <Stack.Screen 
        name="LeaguesMain" 
        component={LeaguesScreen} 
        options={{ title: 'My Leagues' }} 
      />
      <Stack.Screen 
        name="LeagueDetail" 
        component={LeagueDetailScreen}
        options={({ route }) => ({ title: route.params?.leagueName || 'League' })}
      />
      <Stack.Screen 
        name="WaiverWire" 
        component={WaiverWireScreen}
        options={{ title: 'Waiver Wire' }}
      />
      <Stack.Screen 
        name="History" 
        component={HistoryScreen}
        options={{ title: 'League History' }}
      />
    </Stack.Navigator>
  );
};

const PlayersStackNavigator = () => {
  const theme = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontFamily: 'Inter-SemiBold',
        },
      }}
    >
      <Stack.Screen 
        name="PlayersMain" 
        component={PlayersScreen} 
        options={{ title: 'Players' }} 
      />
      <Stack.Screen 
        name="PlayerDetail" 
        component={PlayerDetailScreen}
        options={({ route }) => ({ title: route.params?.playerName || 'Player' })}
      />
    </Stack.Navigator>
  );
};

const TradesStackNavigator = () => {
  const theme = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontFamily: 'Inter-SemiBold',
        },
      }}
    >
      <Stack.Screen 
        name="TradesMain" 
        component={TradesScreen} 
        options={{ title: 'Trade Hub' }} 
      />
      <Stack.Screen 
        name="TradeDetail" 
        component={TradeDetailScreen}
        options={{ title: 'Trade Details' }}
      />
    </Stack.Navigator>
  );
};

const ProfileStackNavigator = () => {
  const theme = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontFamily: 'Inter-SemiBold',
        },
      }}
    >
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen} 
        options={{ title: 'Profile' }} 
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen 
        name="Achievements" 
        component={AchievementsScreen}
        options={{ title: 'Achievements' }}
      />
    </Stack.Navigator>
  );
};

const MainNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Leagues':
              iconName = focused ? 'trophy' : 'trophy-outline';
              break;
            case 'Players':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Trades':
              iconName = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          height: 60,
          paddingBottom: 5,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Regular',
          fontSize: 12,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Leagues" component={LeaguesStackNavigator} />
      <Tab.Screen name="Players" component={PlayersStackNavigator} />
      <Tab.Screen name="Trades" component={TradesStackNavigator} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
};

export default MainNavigator;