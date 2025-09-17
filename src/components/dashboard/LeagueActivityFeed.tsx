'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown,
  MessageCircle,
  Trophy,
  TrendingUp,
  UserPlus,
  Settings,
  AlertTriangle,
  Clock,
  Heart,
  MessageSquare,
  Share2,
  ChevronRight,
  Filter,
  Bell
} from 'lucide-react';
import Image from 'next/image';

type ActivityType = 'trade' | 'waiver' | 'message' | 'matchup' | 'injury' | 'milestone' | 'roster';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  user: {
    name: string;
    avatar?: string;
    team: string;
  };
  relatedUser?: {
    name: string;
    avatar?: string;
    team: string;
  };
  metadata?: {
    players?: string[];
    score?: string;
    achievement?: string;
    injury?: {
      player: string;
      status: string;
      impact: 'high' | 'medium' | 'low';
    };
  };
  reactions?: {
    likes: number;
    comments: number;
    isLiked?: boolean;
  };
}

export default function LeagueActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulated data - replace with actual API/WebSocket
    const mockActivities: Activity[] = [
      {
        id: '1',
        type: 'trade',
        title: 'Trade Alert',
        description: 'Blockbuster trade completed',
        timestamp: '2 hours ago',
        user: {
          name: 'Mike Johnson',
          team: 'Thunder Bolts'
        },
        relatedUser: {
          name: 'Sarah Williams',
          team: 'Lightning Strike'
        },
        metadata: {
          players: ['Justin Jefferson', 'Josh Jacobs', 'Calvin Ridley', '2024 1st Round Pick']
        },
        reactions: {
          likes: 12,
          comments: 8,
          isLiked: false
        }
      },
      {
        id: '2',
        type: 'injury',
        title: 'Injury Update',
        description: 'Key player injury affects multiple teams',
        timestamp: '3 hours ago',
        user: {
          name: 'System',
          team: 'League Update'
        },
        metadata: {
          injury: {
            player: 'Christian McCaffrey',
            status: 'OUT - Hamstring',
            impact: 'high'
          }
        },
        reactions: {
          likes: 3,
          comments: 15,
          isLiked: true
        }
      },
      {
        id: '3',
        type: 'matchup',
        title: 'Upset Victory',
        description: 'Underdog takes down league leader',
        timestamp: '5 hours ago',
        user: {
          name: 'David Chen',
          team: 'Dark Horses'
        },
        relatedUser: {
          name: 'Tom Brady Jr.',
          team: 'Dynasty Kings'
        },
        metadata: {
          score: '142.8 - 138.2'
        },
        reactions: {
          likes: 24,
          comments: 12,
          isLiked: false
        }
      },
      {
        id: '4',
        type: 'milestone',
        title: 'Achievement Unlocked',
        description: 'New league record set',
        timestamp: '1 day ago',
        user: {
          name: 'Alex Rivera',
          team: 'Speed Demons'
        },
        metadata: {
          achievement: 'Highest single-week score: 187.4 points'
        },
        reactions: {
          likes: 45,
          comments: 18,
          isLiked: true
        }
      },
      {
        id: '5',
        type: 'waiver',
        title: 'Waiver Wire Activity',
        description: 'Multiple claims processed',
        timestamp: '1 day ago',
        user: {
          name: 'Jessica Park',
          team: 'Rising Stars'
        },
        metadata: {
          players: ['Tank Bigsby', 'Jaylen Warren']
        },
        reactions: {
          likes: 5,
          comments: 3,
          isLiked: false
        }
      }
    ];

    setTimeout(() => {
      setActivities(mockActivities);
      setIsLoading(false);
    }, 500);
  }, []);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'trade': return ArrowUpDown;
      case 'waiver': return UserPlus;
      case 'message': return MessageCircle;
      case 'matchup': return Trophy;
      case 'injury': return AlertTriangle;
      case 'milestone': return TrendingUp;
      case 'roster': return Settings;
      default: return Bell;
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'trade': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'waiver': return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'message': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
      case 'matchup': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400';
      case 'injury': return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      case 'milestone': return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400';
      case 'roster': return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  const handleReaction = (activityId: string, type: 'like' | 'comment') => {
    setActivities(prev => prev.map(activity => {
      if (activity.id === activityId && activity.reactions) {
        if (type === 'like') {
          return {
            ...activity,
            reactions: {
              ...activity.reactions,
              likes: activity.reactions.isLiked 
                ? activity.reactions.likes - 1 
                : activity.reactions.likes + 1,
              isLiked: !activity.reactions.isLiked
            }
          };
        }
      }
      return activity;
    }));
  };

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter);

  const ActivityCard = ({ activity }: { activity: Activity }) => {
    const Icon = getActivityIcon(activity.type);
    const colorClass = getActivityColor(activity.type);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {activity.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {activity.description}
                </p>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {activity.timestamp}
              </span>
            </div>

            {/* Users */}
            <div className="flex items-center gap-2 text-xs mb-3">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {activity.user.name}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                ({activity.user.team})
              </span>
              {activity.relatedUser && (
                <>
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {activity.relatedUser.name}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    ({activity.relatedUser.team})
                  </span>
                </>
              )}
            </div>

            {/* Metadata */}
            {activity.metadata && (
              <div className="mb-3">
                {activity.metadata.players && (
                  <div className="flex flex-wrap gap-1">
                    {activity.metadata.players.map((player, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-700 dark:text-gray-300"
                      >
                        {player}
                      </span>
                    ))}
                  </div>
                )}
                {activity.metadata.score && (
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {activity.metadata.score}
                  </div>
                )}
                {activity.metadata.achievement && (
                  <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded">
                    <Trophy className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                      {activity.metadata.achievement}
                    </span>
                  </div>
                )}
                {activity.metadata.injury && (
                  <div className={`p-2 rounded ${
                    activity.metadata.injury.impact === 'high' 
                      ? 'bg-red-50 dark:bg-red-900/20' 
                      : activity.metadata.injury.impact === 'medium'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20'
                      : 'bg-gray-50 dark:bg-gray-700/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {activity.metadata.injury.player}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        activity.metadata.injury.impact === 'high'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : activity.metadata.injury.impact === 'medium'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {activity.metadata.injury.impact} impact
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {activity.metadata.injury.status}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Reactions */}
            {activity.reactions && (
              <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => handleReaction(activity.id, 'like')}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    activity.reactions.isLiked
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${activity.reactions.isLiked ? 'fill-current' : ''}`} />
                  <span>{activity.reactions.likes}</span>
                </button>
                <button
                  onClick={() => handleReaction(activity.id, 'comment')}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{activity.reactions.comments}</span>
                </button>
                <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors ml-auto">
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">League Activity</h3>
          <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <Bell className="h-5 w-5" />
          </button>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {(['all', 'trade', 'waiver', 'matchup', 'injury', 'milestone'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filter === type
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
              {type === 'all' && ` (${activities.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence>
            {filteredActivities.map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}