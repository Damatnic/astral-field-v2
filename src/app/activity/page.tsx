'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, Users, ArrowRightLeft, Trophy, UserPlus } from 'lucide-react';

// Mock activity data for D'Amato Dynasty League
const recentActivity = [
  {
    id: 1,
    type: 'trade',
    user: "Nicholas D'Amato",
    action: 'proposed a trade',
    details: 'Travis Kelce for DeAndre Hopkins + 2024 2nd',
    target: 'Nick Hartley',
    timestamp: '2 hours ago',
    icon: ArrowRightLeft,
    color: 'text-blue-600'
  },
  {
    id: 2,
    type: 'waiver',
    user: 'Jon Kornbeck',
    action: 'claimed from waivers',
    details: 'Jerome Ford',
    target: null,
    timestamp: '4 hours ago',
    icon: UserPlus,
    color: 'text-green-600'
  },
  {
    id: 3,
    type: 'lineup',
    user: 'Jack McCaigue',
    action: 'updated lineup',
    details: 'Set starting lineup for Week 3',
    target: null,
    timestamp: '6 hours ago',
    icon: Users,
    color: 'text-purple-600'
  },
  {
    id: 4,
    type: 'trade',
    user: 'David Jarvey',
    action: 'accepted trade',
    details: 'Jaylen Waddle for 2024 1st + Ezekiel Elliott',
    target: 'Brittany Bergum',
    timestamp: '1 day ago',
    icon: ArrowRightLeft,
    color: 'text-blue-600'
  },
  {
    id: 5,
    type: 'score',
    user: 'Cason Minor',
    action: 'highest score',
    details: 'Week 2: 156.8 points',
    target: null,
    timestamp: '3 days ago',
    icon: Trophy,
    color: 'text-yellow-600'
  }
];

function ActivityItem({ activity }: { activity: any }) {
  const IconComponent = activity.icon;
  
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-full bg-slate-100 ${activity.color}`}>
            <IconComponent className="h-4 w-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-900">{activity.user}</span>
              <span className="text-slate-600">{activity.action}</span>
              {activity.target && (
                <>
                  <span className="text-slate-400">→</span>
                  <span className="font-medium text-slate-700">{activity.target}</span>
                </>
              )}
            </div>
            
            <div className="text-sm text-slate-600 mt-1">
              {activity.details}
            </div>
            
            <div className="flex items-center mt-2">
              <Clock className="h-3 w-3 text-slate-400 mr-1" />
              <span className="text-xs text-slate-400">{activity.timestamp}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ActivityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Activity className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-4xl font-bold text-slate-900">League Activity</h1>
          </div>
          <p className="text-xl text-slate-600">
            Recent activity and updates from the D&apos;Amato Dynasty League
          </p>
        </div>

        {/* Activity Filter */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-2">
            <Badge variant="default" className="bg-blue-600">All Activity</Badge>
            <Badge variant="outline">Trades</Badge>
            <Badge variant="outline">Waivers</Badge>
            <Badge variant="outline">Lineups</Badge>
            <Badge variant="outline">Scores</Badge>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Recent Activity</h2>
          {recentActivity.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-8">
          <Card className="border-slate-200">
            <CardContent className="p-6">
              <Activity className="h-8 w-8 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">
                Activity feed shows the latest league updates and member actions.
                Track trades, waivers, lineup changes, and championship progress in real-time.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}