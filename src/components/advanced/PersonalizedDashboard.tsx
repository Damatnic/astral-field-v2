'use client';

import React, { useState, useCallback } from 'react';
import { motion, Reorder } from 'framer-motion';
import {
  Settings,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  X,
  TrendingUp,
  Trophy,
  Users,
  BarChart3,
  Activity,
  Calendar,
  Target,
  Zap,
  Edit3,
  ChevronRight
} from 'lucide-react';

// Widget Configuration Types
export interface DashboardWidget {
  id: string;
  type: 'stat' | 'chart' | 'list' | 'feed' | 'calendar' | 'quick-actions';
  title: string;
  subtitle?: string;
  isVisible: boolean;
  position: number;
  size: 'small' | 'medium' | 'large' | 'full';
  data?: any;
  config?: {
    refreshInterval?: number;
    showHeader?: boolean;
    customColor?: string;
  };
}

export interface DashboardLayout {
  name: string;
  widgets: DashboardWidget[];
  isCustom: boolean;
}

// Personalized Dashboard Component with ESPN/Yahoo-style customization
export function PersonalizedDashboard() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout>({
    name: 'My Dashboard',
    isCustom: false,
    widgets: [
      {
        id: 'league-standings',
        type: 'stat',
        title: 'League Standings',
        subtitle: 'Your current rank',
        isVisible: true,
        position: 0,
        size: 'medium',
        data: { rank: 2, total: 12, record: '7-2' }
      },
      {
        id: 'weekly-matchup',
        type: 'stat',
        title: 'This Week',
        subtitle: 'Your matchup status',
        isVisible: true,
        position: 1,
        size: 'medium',
        data: { opponent: 'Mike\'s Team', projectedScore: 128.5, opponentScore: 112.3 }
      },
      {
        id: 'trending-players',
        type: 'list',
        title: 'Trending Players',
        subtitle: 'Hot pickups this week',
        isVisible: true,
        position: 2,
        size: 'large',
        data: []
      },
      {
        id: 'injury-report',
        type: 'feed',
        title: 'Injury Updates',
        subtitle: 'Latest player news',
        isVisible: true,
        position: 3,
        size: 'large',
        data: []
      },
      {
        id: 'schedule',
        type: 'calendar',
        title: 'Upcoming Games',
        subtitle: 'Next 7 days',
        isVisible: true,
        position: 4,
        size: 'full',
        data: []
      },
      {
        id: 'quick-actions',
        type: 'quick-actions',
        title: 'Quick Actions',
        subtitle: 'Manage your team',
        isVisible: true,
        position: 5,
        size: 'small',
        data: []
      }
    ]
  });

  const [availableWidgets] = useState([
    { id: 'waiver-wire', type: 'list', title: 'Waiver Wire', size: 'medium' },
    { id: 'trade-analyzer', type: 'chart', title: 'Trade Analyzer', size: 'large' },
    { id: 'power-rankings', type: 'chart', title: 'Power Rankings', size: 'medium' },
    { id: 'player-stats', type: 'chart', title: 'Player Statistics', size: 'large' },
    { id: 'league-activity', type: 'feed', title: 'League Activity', size: 'medium' },
    { id: 'playoff-odds', type: 'stat', title: 'Playoff Odds', size: 'small' }
  ]);

  // Handle widget reordering
  const handleReorder = useCallback((newOrder: DashboardWidget[]) => {
    setCurrentLayout(prev => ({
      ...prev,
      widgets: newOrder.map((widget, index) => ({
        ...widget,
        position: index
      }))
    }));
  }, []);

  // Toggle widget visibility
  const toggleWidgetVisibility = useCallback((widgetId: string) => {
    setCurrentLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget =>
        widget.id === widgetId 
          ? { ...widget, isVisible: !widget.isVisible }
          : widget
      )
    }));
  }, []);

  // Add new widget
  const addWidget = useCallback((widgetTemplate: any) => {
    const newWidget: DashboardWidget = {
      ...widgetTemplate,
      id: `${widgetTemplate.id}-${Date.now()}`,
      isVisible: true,
      position: currentLayout.widgets.length,
      data: {}
    };
    
    setCurrentLayout(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget]
    }));
  }, [currentLayout.widgets.length]);

  // Remove widget
  const removeWidget = useCallback((widgetId: string) => {
    setCurrentLayout(prev => ({
      ...prev,
      widgets: prev.widgets.filter(widget => widget.id !== widgetId)
    }));
  }, []);

  const visibleWidgets = currentLayout.widgets.filter(w => w.isVisible);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isEditMode ? 'Customize Dashboard' : currentLayout.name}
          </h1>
          <p className="text-gray-600">
            {isEditMode ? 'Drag widgets to reorder, toggle visibility, or add new ones' : 'Your personalized fantasy command center'}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              isEditMode 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isEditMode ? (
              <>
                <Settings className="w-4 h-4" />
                <span>Done Editing</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                <span>Customize</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Edit Mode Toolbar */}
      {isEditMode && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="font-semibold text-blue-900">Add Widgets</h3>
              <div className="flex space-x-2">
                {availableWidgets.map((widget) => (
                  <button
                    key={widget.id}
                    onClick={() => addWidget(widget)}
                    className="px-3 py-1 text-sm bg-white border border-blue-300 rounded-lg hover:bg-blue-50 text-blue-700 transition-colors"
                  >
                    <Plus className="w-3 h-3 inline mr-1" />
                    {widget.title}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="text-sm text-blue-700">
              <GripVertical className="w-4 h-4 inline mr-1" />
              Drag to reorder widgets
            </div>
          </div>
        </motion.div>
      )}

      {/* Dashboard Grid */}
      <div className="space-y-6">
        {isEditMode ? (
          <Reorder.Group
            axis="y"
            values={currentLayout.widgets}
            onReorder={handleReorder}
            className="space-y-6"
          >
            {currentLayout.widgets.map((widget) => (
              <Reorder.Item
                key={widget.id}
                value={widget}
                className={`${widget.isVisible ? '' : 'opacity-50'}`}
              >
                <EditableWidget
                  widget={widget}
                  onToggleVisibility={() => toggleWidgetVisibility(widget.id)}
                  onRemove={() => removeWidget(widget.id)}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        ) : (
          <DashboardGrid widgets={visibleWidgets} />
        )}
      </div>
    </div>
  );
}

// Dashboard Grid Layout
function DashboardGrid({ widgets }: { widgets: DashboardWidget[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {widgets.map((widget) => (
        <motion.div
          key={widget.id}
          className={getGridSpan(widget.size)}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <DashboardWidget widget={widget} />
        </motion.div>
      ))}
    </div>
  );
}

// Editable Widget Component
function EditableWidget({
  widget,
  onToggleVisibility,
  onRemove
}: {
  widget: DashboardWidget;
  onToggleVisibility: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-6 hover:border-blue-400 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
          <div>
            <h3 className="font-semibold text-gray-900">{widget.title}</h3>
            {widget.subtitle && (
              <p className="text-sm text-gray-600">{widget.subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleVisibility}
            className={`p-2 rounded-lg transition-colors ${
              widget.isVisible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            {widget.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={onRemove}
            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 h-32 flex items-center justify-center">
        <span className="text-gray-500 text-sm">Widget Preview</span>
      </div>
    </div>
  );
}

// Individual Dashboard Widget
function DashboardWidget({ widget }: { widget: DashboardWidget }) {
  const getWidgetIcon = (type: string) => {
    switch (type) {
      case 'stat': return <BarChart3 className="w-5 h-5" />;
      case 'chart': return <TrendingUp className="w-5 h-5" />;
      case 'list': return <Users className="w-5 h-5" />;
      case 'feed': return <Activity className="w-5 h-5" />;
      case 'calendar': return <Calendar className="w-5 h-5" />;
      case 'quick-actions': return <Zap className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden h-full"
    >
      {/* Widget Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-blue-600">
              {getWidgetIcon(widget.type)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{widget.title}</h3>
              {widget.subtitle && (
                <p className="text-sm text-gray-600">{widget.subtitle}</p>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-6">
        <WidgetContent widget={widget} />
      </div>
    </motion.div>
  );
}

// Widget Content Based on Type
function WidgetContent({ widget }: { widget: DashboardWidget }) {
  switch (widget.type) {
    case 'stat':
      return <StatWidget data={widget.data} />;
    case 'list':
      return <ListWidget />;
    case 'feed':
      return <FeedWidget />;
    case 'quick-actions':
      return <QuickActionsWidget />;
    default:
      return (
        <div className="flex items-center justify-center h-32 text-gray-500">
          <span>Widget content loading...</span>
        </div>
      );
  }
}

// Stat Widget Component
function StatWidget({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      {data.rank && (
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Current Rank</span>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">#{data.rank}</div>
            <div className="text-sm text-gray-500">of {data.total}</div>
          </div>
        </div>
      )}
      
      {data.record && (
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Record</span>
          <span className="text-lg font-semibold">{data.record}</span>
        </div>
      )}
      
      {data.projectedScore && (
        <div className="bg-green-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-green-700 font-medium">Projected Score</span>
            <span className="text-xl font-bold text-green-800">{data.projectedScore}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// List Widget Component
function ListWidget() {
  const [players, setPlayers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchTrendingPlayers = async () => {
      try {
        const response = await fetch('/api/players?limit=5&search=');
        if (response.ok) {
          const data = await response.json();
          const playersData = data.data || [];
          
          // Transform and filter for trending players
          const trendingPlayers = playersData
            .filter((p: any) => p.seasonStats?.trend === 'up' || Math.random() > 0.5)
            .slice(0, 3)
            .map((player: any) => ({
              name: player.name,
              team: player.nflTeam || 'FA',
              trend: player.seasonStats?.trend || 'up',
              ownership: `${Math.floor(Math.random() * 80) + 10}%` // Simulated ownership percentage
            }));
          
          setPlayers(trendingPlayers);
        }
      } catch (error) {
        console.error('Error fetching trending players:', error);
        // Fallback data
        setPlayers([
          { name: 'Loading...', team: '', trend: 'up', ownership: '0%' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingPlayers();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-2 animate-pulse">
            <div>
              <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-12"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-8"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {players.map((player, index) => (
        <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium text-gray-900">{player.name}</div>
            <div className="text-sm text-gray-600">{player.team}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-sm text-gray-600">{player.ownership}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Feed Widget Component
function FeedWidget() {
  const [updates, setUpdates] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchActivityFeed = async () => {
      try {
        // Try to fetch real activity data
        const response = await fetch('/api/activity');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const activityUpdates = data.data.slice(0, 3).map((activity: any) => ({
              type: activity.type || 'news',
              message: activity.description || activity.message,
              time: formatTimeAgo(activity.createdAt || activity.timestamp),
              severity: getSeverityFromActivity(activity)
            }));
            
            setUpdates(activityUpdates);
          } else {
            // Fallback to player-based updates
            await fetchPlayerBasedUpdates();
          }
        } else {
          await fetchPlayerBasedUpdates();
        }
      } catch (error) {
        console.error('Error fetching activity feed:', error);
        await fetchPlayerBasedUpdates();
      } finally {
        setLoading(false);
      }
    };

    const fetchPlayerBasedUpdates = async () => {
      try {
        const response = await fetch('/api/players?limit=3');
        if (response.ok) {
          const data = await response.json();
          const players = data.data || [];
          
          const playerUpdates = players.map((player: any, index: number) => ({
            type: player.injuryStatus && player.injuryStatus !== 'Healthy' ? 'injury' : 'news',
            message: generateUpdateMessage(player),
            time: `${(index + 1) * 5} min ago`,
            severity: player.injuryStatus && player.injuryStatus !== 'Healthy' ? 'high' : 'low'
          }));
          
          setUpdates(playerUpdates);
        }
      } catch (error) {
        console.error('Error fetching player updates:', error);
        // Final fallback
        setUpdates([
          { 
            type: 'news',
            message: 'Season updates available',
            time: '5m ago',
            severity: 'low'
          }
        ]);
      }
    };

    fetchActivityFeed();
  }, []);

  const generateUpdateMessage = (player: any): string => {
    if (player.injuryStatus && player.injuryStatus !== 'Healthy') {
      return `${player.name} - ${player.injuryStatus}`;
    }
    
    const messages = [
      `${player.name} trending up this week`,
      `${player.name} sees increased usage`,
      `${player.name} - strong matchup ahead`,
      `${player.name} - waiver wire target`
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const formatTimeAgo = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const getSeverityFromActivity = (activity: any): string => {
    if (activity.type === 'injury' || activity.type === 'trade') return 'high';
    if (activity.type === 'lineup' || activity.type === 'waiver') return 'medium';
    return 'low';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start space-x-3 p-2 animate-pulse">
            <div className="w-2 h-2 rounded-full mt-2 bg-gray-200" />
            <div className="flex-1">
              <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
              <div className="h-2 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {updates.map((update, index) => (
        <div key={index} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg">
          <div className={`w-2 h-2 rounded-full mt-2 ${
            update.severity === 'high' ? 'bg-red-500' :
            update.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
          }`} />
          <div className="flex-1">
            <p className="text-sm text-gray-900">{update.message}</p>
            <p className="text-xs text-gray-500 mt-1">{update.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Quick Actions Widget
function QuickActionsWidget() {
  const actions = [
    { label: 'Set Lineup', icon: Trophy, color: 'bg-blue-500' },
    { label: 'Waivers', icon: Target, color: 'bg-green-500' },
    { label: 'Trades', icon: Users, color: 'bg-purple-500' },
    { label: 'Stats', icon: BarChart3, color: 'bg-orange-500' }
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action, index) => (
        <motion.button
          key={index}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center space-y-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className={`p-2 rounded-lg ${action.color}`}>
            <action.icon className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-medium text-gray-700">{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

// Helper function for grid span classes
function getGridSpan(size: string): string {
  switch (size) {
    case 'small': return 'col-span-1';
    case 'medium': return 'col-span-1 md:col-span-2';
    case 'large': return 'col-span-1 md:col-span-2 lg:col-span-3';
    case 'full': return 'col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4';
    default: return 'col-span-1';
  }
}