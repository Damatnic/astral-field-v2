'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  TrendingUp,
  Bug,
  Zap,
  Database,
  TestTube,
  Smartphone,
  DollarSign,
  Brain,
  Users,
  Settings,
  BarChart3,
  Package,
  Loader2,
  XCircle
} from 'lucide-react';

interface TaskItem {
  id: string;
  task: string;
  status: 'completed' | 'in-progress' | 'not-started' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  estimatedHours: number;
  completedHours?: number;
  notes?: string;
  blockers?: string[];
}

const IMPLEMENTATION_TASKS: TaskItem[] = [
  // Critical Path Tasks
  {
    id: 'draft-1',
    task: 'Fix Draft Room PlayerList component',
    status: 'not-started',
    priority: 'critical',
    category: 'Draft System',
    estimatedHours: 6,
    notes: 'Replace stub with functional component'
  },
  {
    id: 'draft-2',
    task: 'Fix Draft Room TeamRoster component',
    status: 'not-started',
    priority: 'critical',
    category: 'Draft System',
    estimatedHours: 5,
    notes: 'Replace stub with functional component'
  },
  {
    id: 'draft-3',
    task: 'Fix Draft Room DraftChat component',
    status: 'not-started',
    priority: 'critical',
    category: 'Draft System',
    estimatedHours: 5,
    notes: 'Replace stub with functional component'
  },
  {
    id: 'db-1',
    task: 'Implement JobExecution model',
    status: 'not-started',
    priority: 'high',
    category: 'Database',
    estimatedHours: 4,
    notes: 'Required for waiver automation tracking'
  },
  {
    id: 'api-1',
    task: 'Fix API error handling',
    status: 'not-started',
    priority: 'high',
    category: 'Backend',
    estimatedHours: 8,
    notes: 'Add comprehensive error handling to all endpoints'
  },
  {
    id: 'draft-4',
    task: 'Complete Draft real-time synchronization',
    status: 'not-started',
    priority: 'critical',
    category: 'Draft System',
    estimatedHours: 12,
    notes: 'WebSocket integration and testing'
  },
  {
    id: 'auth-1',
    task: 'Test authentication flow end-to-end',
    status: 'in-progress',
    priority: 'critical',
    category: 'Authentication',
    estimatedHours: 4,
    completedHours: 2,
    notes: 'Login working, needs session validation'
  },
  {
    id: 'score-1',
    task: 'Validate scoring calculations',
    status: 'not-started',
    priority: 'high',
    category: 'Scoring',
    estimatedHours: 8,
    notes: 'Ensure accuracy of all scoring methods'
  },
  {
    id: 'int-1',
    task: 'Complete Sleeper API integration',
    status: 'in-progress',
    priority: 'high',
    category: 'Integrations',
    estimatedHours: 12,
    completedHours: 5,
    notes: 'Player sync and stats updates'
  },
  {
    id: 'cache-1',
    task: 'Fix cache synchronization',
    status: 'not-started',
    priority: 'medium',
    category: 'Infrastructure',
    estimatedHours: 8,
    notes: 'Redis/PostgreSQL consistency'
  },
  {
    id: 'test-1',
    task: 'Draft room integration tests',
    status: 'not-started',
    priority: 'critical',
    category: 'Testing',
    estimatedHours: 8,
    notes: 'Real-time functionality testing'
  },
  {
    id: 'test-2',
    task: 'Trade system edge case testing',
    status: 'not-started',
    priority: 'high',
    category: 'Testing',
    estimatedHours: 6,
    notes: 'Multi-player trades, vetoes, etc.'
  },
  {
    id: 'test-3',
    task: 'Mobile PWA testing',
    status: 'in-progress',
    priority: 'medium',
    category: 'Testing',
    estimatedHours: 4,
    completedHours: 2,
    notes: 'Offline, install, push notifications'
  },
  {
    id: 'test-4',
    task: 'Load testing',
    status: 'not-started',
    priority: 'medium',
    category: 'Testing',
    estimatedHours: 8,
    notes: '100+ concurrent users'
  }
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Draft System': <Package className="w-4 h-4" />,
  'Database': <Database className="w-4 h-4" />,
  'Backend': <Settings className="w-4 h-4" />,
  'Authentication': <Users className="w-4 h-4" />,
  'Scoring': <BarChart3 className="w-4 h-4" />,
  'Integrations': <Zap className="w-4 h-4" />,
  'Infrastructure': <Settings className="w-4 h-4" />,
  'Testing': <TestTube className="w-4 h-4" />,
  'Mobile': <Smartphone className="w-4 h-4" />,
  'Payments': <DollarSign className="w-4 h-4" />,
  'AI': <Brain className="w-4 h-4" />
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  'completed': <CheckCircle2 className="w-4 h-4 text-green-600" />,
  'in-progress': <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />,
  'not-started': <Circle className="w-4 h-4 text-gray-400" />,
  'blocked': <XCircle className="w-4 h-4 text-red-600" />
};

const PRIORITY_COLORS: Record<string, string> = {
  'critical': 'bg-red-100 text-red-800 border-red-300',
  'high': 'bg-orange-100 text-orange-800 border-orange-300',
  'medium': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'low': 'bg-gray-100 text-gray-800 border-gray-300'
};

export default function ProgressTracker() {
  const [tasks, setTasks] = useState(IMPLEMENTATION_TASKS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
  const notStartedTasks = tasks.filter(t => t.status === 'not-started').length;

  const totalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
  const completedHours = tasks.reduce((sum, t) => sum + (t.completedHours || 0), 0);
  const progressPercentage = Math.round((completedTasks / totalTasks) * 100);

  // Get unique categories
  const categories = Array.from(new Set(tasks.map(t => t.category)));

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const categoryMatch = selectedCategory === 'all' || task.category === selectedCategory;
    const priorityMatch = selectedPriority === 'all' || task.priority === selectedPriority;
    return categoryMatch && priorityMatch;
  });

  // Group tasks by category
  const tasksByCategory = filteredTasks.reduce((acc, task) => {
    if (!acc[task.category]) acc[task.category] = [];
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, TaskItem[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AstralField Implementation Progress</h1>
        <p className="text-gray-600 mt-2">Track development progress and remaining tasks</p>
      </div>

      {/* Overall Progress */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Progress</p>
                <p className="text-2xl font-bold text-gray-900">{progressPercentage}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <Progress value={progressPercentage} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasks Status</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    <span className="text-sm">{completedTasks} Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 text-blue-600" />
                    <span className="text-sm">{inProgressTasks} In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className="w-3 h-3 text-gray-400" />
                    <span className="text-sm">{notStartedTasks} Not Started</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hours Tracking</p>
                <p className="text-2xl font-bold text-gray-900">{completedHours}/{totalHours}h</p>
                <Progress value={(completedHours / totalHours) * 100} className="mt-3" />
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Tasks</p>
                <p className="text-2xl font-bold text-red-600">
                  {tasks.filter(t => t.priority === 'critical' && t.status !== 'completed').length}
                </p>
                <p className="text-sm text-gray-500 mt-1">Remaining</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Task Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Category</label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Priority</label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(tasksByCategory).map(([category, categoryTasks]) => (
              <div key={category} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  {CATEGORY_ICONS[category]}
                  <h3 className="font-semibold text-lg">{category}</h3>
                  <Badge variant="secondary">
                    {categoryTasks.filter(t => t.status === 'completed').length}/{categoryTasks.length}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {categoryTasks.map(task => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        task.status === 'completed' ? 'bg-green-50' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {STATUS_ICONS[task.status]}
                        <div className="flex-1">
                          <p className={`font-medium ${
                            task.status === 'completed' ? 'line-through text-gray-500' : ''
                          }`}>
                            {task.task}
                          </p>
                          {task.notes && (
                            <p className="text-sm text-gray-600 mt-1">{task.notes}</p>
                          )}
                          {task.blockers && task.blockers.length > 0 && (
                            <div className="mt-1">
                              {task.blockers.map((blocker, idx) => (
                                <Badge key={idx} variant="destructive" className="mr-1 text-xs">
                                  Blocked: {blocker}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge className={PRIORITY_COLORS[task.priority]}>
                          {task.priority}
                        </Badge>
                        <div className="text-sm text-gray-600">
                          {task.completedHours || 0}/{task.estimatedHours}h
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">Fixed login page with 10-man league roster</span>
              <span className="text-gray-500 ml-auto">2 hours ago</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">Implemented quick login functionality</span>
              <span className="text-gray-500 ml-auto">3 hours ago</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">Fixed text color contrast issues</span>
              <span className="text-gray-500 ml-auto">4 hours ago</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Bug className="w-4 h-4 text-red-600" />
              <span className="text-gray-600">Identified draft room stub components issue</span>
              <span className="text-gray-500 ml-auto">5 hours ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}