'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, Trophy, Users, ChevronLeft, ChevronRight } from 'lucide-react';

// Mock schedule data for D'Amato Dynasty League
const scheduleData = {
  currentWeek: 3,
  season: 2024,
  weeks: [
    {
      week: 1,
      startDate: '2024-09-05',
      endDate: '2024-09-09',
      matchups: [
        {
          id: 1,
          team1: { name: "Nicholas D'Amato", record: '1-0', score: 127.5 },
          team2: { name: 'Nick Hartley', record: '0-1', score: 98.2 },
          status: 'completed'
        },
        {
          id: 2,
          team1: { name: 'Jon Kornbeck', record: '1-0', score: 134.8 },
          team2: { name: 'Brittany Bergum', record: '0-1', score: 112.4 },
          status: 'completed'
        },
        {
          id: 3,
          team1: { name: 'Jack McCaigue', record: '1-0', score: 141.2 },
          team2: { name: 'Larry McCaigue', record: '0-1', score: 108.7 },
          status: 'completed'
        },
        {
          id: 4,
          team1: { name: 'Cason Minor', record: '1-0', score: 119.6 },
          team2: { name: 'Renee McCaigue', record: '0-1', score: 95.3 },
          status: 'completed'
        },
        {
          id: 5,
          team1: { name: 'David Jarvey', record: '1-0', score: 156.8 },
          team2: { name: 'Kaity Lorbecki', record: '0-1', score: 103.1 },
          status: 'completed'
        }
      ]
    },
    {
      week: 2,
      startDate: '2024-09-12',
      endDate: '2024-09-16',
      matchups: [
        {
          id: 6,
          team1: { name: "Nicholas D'Amato", record: '2-0', score: 145.3 },
          team2: { name: 'Jon Kornbeck', record: '1-1', score: 132.1 },
          status: 'completed'
        },
        {
          id: 7,
          team1: { name: 'Jack McCaigue', record: '2-0', score: 128.9 },
          team2: { name: 'Cason Minor', record: '1-1', score: 115.7 },
          status: 'completed'
        },
        {
          id: 8,
          team1: { name: 'David Jarvey', record: '2-0', score: 139.4 },
          team2: { name: 'Nick Hartley', record: '0-2', score: 102.8 },
          status: 'completed'
        },
        {
          id: 9,
          team1: { name: 'Brittany Bergum', record: '1-1', score: 121.6 },
          team2: { name: 'Larry McCaigue', record: '0-2', score: 94.2 },
          status: 'completed'
        },
        {
          id: 10,
          team1: { name: 'Renee McCaigue', record: '1-1', score: 107.9 },
          team2: { name: 'Kaity Lorbecki', record: '0-2', score: 89.5 },
          status: 'completed'
        }
      ]
    },
    {
      week: 3,
      startDate: '2024-09-19',
      endDate: '2024-09-23',
      matchups: [
        {
          id: 11,
          team1: { name: "Nicholas D'Amato", record: '2-0', score: 0 },
          team2: { name: 'Jack McCaigue', record: '2-0', score: 0 },
          status: 'upcoming'
        },
        {
          id: 12,
          team1: { name: 'David Jarvey', record: '2-0', score: 0 },
          team2: { name: 'Brittany Bergum', record: '1-1', score: 0 },
          status: 'upcoming'
        },
        {
          id: 13,
          team1: { name: 'Renee McCaigue', record: '1-1', score: 0 },
          team2: { name: 'Jon Kornbeck', record: '1-1', score: 0 },
          status: 'upcoming'
        },
        {
          id: 14,
          team1: { name: 'Cason Minor', record: '1-1', score: 0 },
          team2: { name: 'Nick Hartley', record: '0-2', score: 0 },
          status: 'upcoming'
        },
        {
          id: 15,
          team1: { name: 'Larry McCaigue', record: '0-2', score: 0 },
          team2: { name: 'Kaity Lorbecki', record: '0-2', score: 0 },
          status: 'upcoming'
        }
      ]
    }
  ]
};

function MatchupCard({ matchup }: { matchup: any }) {
  const isCompleted = matchup.status === 'completed';
  const winner = isCompleted ? 
    (matchup.team1.score > matchup.team2.score ? matchup.team1 : matchup.team2) : null;
  
  return (
    <Card className="border-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Team 1 */}
          <div className={`flex-1 text-center p-3 rounded-lg ${
            winner?.name === matchup.team1.name ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
          }`}>
            <div className="font-semibold text-slate-900">{matchup.team1.name}</div>
            <div className="text-sm text-slate-600">{matchup.team1.record}</div>
            {isCompleted && (
              <div className={`text-lg font-bold mt-1 ${
                winner?.name === matchup.team1.name ? 'text-green-600' : 'text-slate-600'
              }`}>
                {matchup.team1.score}
              </div>
            )}
          </div>
          
          {/* VS */}
          <div className="px-4">
            <div className="text-slate-400 font-medium">VS</div>
          </div>
          
          {/* Team 2 */}
          <div className={`flex-1 text-center p-3 rounded-lg ${
            winner?.name === matchup.team2.name ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
          }`}>
            <div className="font-semibold text-slate-900">{matchup.team2.name}</div>
            <div className="text-sm text-slate-600">{matchup.team2.record}</div>
            {isCompleted && (
              <div className={`text-lg font-bold mt-1 ${
                winner?.name === matchup.team2.name ? 'text-green-600' : 'text-slate-600'
              }`}>
                {matchup.team2.score}
              </div>
            )}
          </div>
        </div>
        
        {/* Status */}
        <div className="mt-3 text-center">
          <Badge variant={isCompleted ? "default" : "secondary"} className={isCompleted ? 'bg-green-100 text-green-800' : ''}>
            {isCompleted ? 'Final' : 'Upcoming'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SchedulePage() {
  const [selectedWeek, setSelectedWeek] = useState(scheduleData.currentWeek);
  const currentWeekData = scheduleData.weeks.find(w => w.week === selectedWeek);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <CalendarDays className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-4xl font-bold text-slate-900">League Schedule</h1>
          </div>
          <p className="text-xl text-slate-600">
            D'Amato Dynasty League • {scheduleData.season} Season
          </p>
        </div>

        {/* Week Navigator */}
        <div className="flex items-center justify-center mb-8">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
            disabled={selectedWeek === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="mx-6 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Week {selectedWeek}</h2>
            {currentWeekData && (
              <p className="text-sm text-slate-600">
                {new Date(currentWeekData.startDate).toLocaleDateString()} - {new Date(currentWeekData.endDate).toLocaleDateString()}
              </p>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedWeek(Math.min(scheduleData.weeks.length, selectedWeek + 1))}
            disabled={selectedWeek === scheduleData.weeks.length}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Week Selector */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-2">
            {scheduleData.weeks.map((week) => (
              <Button
                key={week.week}
                variant={selectedWeek === week.week ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedWeek(week.week)}
                className={selectedWeek === week.week ? 'bg-blue-600' : ''}
              >
                Week {week.week}
              </Button>
            ))}
          </div>
        </div>

        {/* Matchups */}
        {currentWeekData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-900">
                Week {selectedWeek} Matchups
              </h3>
              {selectedWeek === scheduleData.currentWeek && (
                <Badge className="bg-blue-100 text-blue-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Current Week
                </Badge>
              )}
            </div>
            
            <div className="grid gap-4">
              {currentWeekData.matchups.map((matchup) => (
                <MatchupCard key={matchup.id} matchup={matchup} />
              ))}
            </div>
          </div>
        )}

        {/* Season Info */}
        <Card className="mt-12 border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
              Season Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">{scheduleData.season}</div>
                <div className="text-sm text-slate-600">Season</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">{scheduleData.currentWeek}</div>
                <div className="text-sm text-slate-600">Current Week</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">10</div>
                <div className="text-sm text-slate-600">Teams</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}