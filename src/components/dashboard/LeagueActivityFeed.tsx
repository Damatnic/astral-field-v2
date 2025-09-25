'use client';


import { handleComponentError } from '@/lib/error-handling';
import React, { useState, useEffect, useCallback } from 'react';
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
  Bell,
  RefreshCw,
  Loader2
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { ActivityFeedSkeleton } from '@/components/ui/Skeleton';

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
    status?: string;
    priority?: number;
    successful?: boolean;
    week?: number;
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
  createdAt: Date;
}

interface LeagueActivityFeedProps {
  leagueId: string;
  className?: string;
}

export default function LeagueActivityFeed({ leagueId, className = '' }: LeagueActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use sonner toast functions directly

  const fetchActivities = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    setError(null);
    
    try {
      const url = new URL(`/api/leagues/${leagueId}/activity`, window.location.origin);
      if (filter !== 'all') {
        url.searchParams.set('type', filter);
      }
      url.searchParams.set('limit', '20');
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (data.toast.success) {
        setActivities(data.activities);
        setError(null);
        
        if (isRefresh) {
          toast.success('Activity feed updated', 'Latest league activity loaded');
        }
      } else {
        setError(data.error || 'Failed to load activities');
        toast.error('Failed to load league activity', data.error);
      }
    } catch (err) {
      handleComponentError(err as Error, 'LeagueActivityFeed');
      setError('Failed to load activities');
      toast.error('Failed to load league activity', 'Please try again');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [leagueId, filter, toast.error, toast.success]);
  
  useEffect(() => {
    if (leagueId) {
      fetchActivities();
    }
  }, [fetchActivities, leagueId]);
  
  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (!leagueId) return;
    
    const interval = setInterval(() => {
      fetchActivities(true);
    }, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [leagueId, fetchActivities]);

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

  const handleReaction = async (activityId: string, type: 'like' | 'comment') => {
    // Optimistic update
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
    
    // Send reaction to API
    try {
      const response = await fetch(`/api/leagues/${leagueId}/activity/${activityId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      
      if (!response.ok) {
        // Revert optimistic update on failure
        fetchActivities(false);
      }
    } catch (error) {
      console.error('Failed to send reaction:', error);
      // Revert optimistic update on error
      fetchActivities(false);
    }
  };
  
  const handleRefresh = () => {
    fetchActivities(true);
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
                    {activity.metadata.status && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        activity.metadata.status === 'accepted' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : activity.metadata.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {activity.metadata.status}
                      </span>
                    )}
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

  if (!leagueId) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <p className="text-center text-gray-500 dark:text-gray-400">No league selected</p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">League Activity</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRefreshing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
            </button>
            <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Bell className="h-5 w-5" />
            </button>
          </div>
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
          <ActivityFeedSkeleton />
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400 font-medium mb-2">Failed to load activity</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{error}</p>
            <button
              onClick={() => fetchActivities()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">No activity yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {filter === 'all' ? 'League activity will appear here' : `No ${filter} activity found`}
            </p>
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