'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { handleComponentError } from '@/lib/error-handling';

interface WeekStatusData {
  currentWeek: number;
  season: number;
  leagueName: string;
  weekStatus: 'upcoming' | 'active' | 'complete';
  timeUntilLineupLock?: string;
  timeUntilWaivers?: string;
  upcomingDeadlines: Array<{
    type: string;
    label: string;
    date: string;
    isUrgent: boolean;
  }>;
}

export default function WeekStatus() {
  const [weekData, setWeekData] = useState<WeekStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeekStatus() {
      try {
        // For now, we'll use mock data since this would come from league settings
        // This could be enhanced to fetch actual deadline data from the API
        const mockWeekData: WeekStatusData = {
          currentWeek: 3,
          season: 2025,
          leagueName: 'Astral Field Championship League 2025',
          weekStatus: 'active',
          timeUntilLineupLock: '2 days, 14 hours',
          timeUntilWaivers: '4 days, 6 hours',
          upcomingDeadlines: [
            {
              type: 'lineup',
              label: 'Lineup Lock',
              date: 'Sun, Sep 22 at 1:00 PM ET',
              isUrgent: true
            },
            {
              type: 'waivers',
              label: 'Waiver Processing',
              date: 'Wed, Sep 25 at 3:00 AM ET',
              isUrgent: false
            },
            {
              type: 'trade',
              label: 'Trade Deadline',
              date: 'Tue, Nov 26 at 11:59 PM ET',
              isUrgent: false
            }
          ]
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setWeekData(mockWeekData);
      } catch (error) {
        handleComponentError(error as Error, 'WeekStatus');
      } finally {
        setLoading(false);
      }
    }

    fetchWeekStatus();
  }, []);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Week Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weekData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Week Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <p>Unable to load week status</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'complete': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Week Status
          </div>
          <Badge 
            variant="outline" 
            className={getStatusColor(weekData.weekStatus)}
          >
            Week {weekData.currentWeek} • {weekData.weekStatus.charAt(0).toUpperCase() + weekData.weekStatus.slice(1)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Week Info */}
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">2025 NFL Season • Week {weekData.currentWeek}</h3>
              <p className="text-sm text-blue-700">{weekData.leagueName}</p>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {weekData.season}
            </Badge>
          </div>
        </div>

        {/* Time Until Key Events */}
        {weekData.weekStatus === 'active' && (
          <div className="space-y-3">
            {weekData.timeUntilLineupLock && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-900">Lineup Lock</span>
                </div>
                <Badge variant="outline" className="bg-amber-100 text-amber-800">
                  {weekData.timeUntilLineupLock}
                </Badge>
              </div>
            )}

            {weekData.timeUntilWaivers && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-900">Waivers Process</span>
                </div>
                <Badge variant="outline" className="bg-purple-100 text-purple-800">
                  {weekData.timeUntilWaivers}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Deadlines */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Upcoming Deadlines</h4>
          <div className="space-y-2">
            {weekData.upcomingDeadlines.map((deadline, index) => (
              <div 
                key={index} 
                className={`flex items-center justify-between p-2 rounded text-sm ${
                  deadline.isUrgent 
                    ? 'bg-red-50 border border-red-200 text-red-800' 
                    : 'bg-gray-50 border border-gray-200 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  {deadline.isUrgent ? (
                    <AlertCircle className="h-3 w-3 text-red-600" />
                  ) : (
                    <CheckCircle className="h-3 w-3 text-gray-500" />
                  )}
                  <span className="font-medium">{deadline.label}</span>
                </div>
                <span className="text-xs">{deadline.date}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}