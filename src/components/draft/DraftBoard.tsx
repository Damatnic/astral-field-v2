'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DraftState {
  id: string;
  leagueId: string;
  status: string;
  type: string;
  currentRound: number;
  currentPick: number;
  timeRemaining: number;
  timePerPick: number;
  totalRounds: number;
  participants: Array<{
    position: number;
    teamId: string;
    teamName: string;
    ownerName: string;
    ownerId: string;
  }>;
  picks: Array<{
    id: string;
    round: number;
    pickInRound: number;
    pickNumber: number;
    teamId: string;
    teamName: string;
    player: {
      id: string;
      name: string;
      position: string;
      nflTeam: string;
    };
    pickMadeAt: string;
  }>;
  currentTeam: {
    teamId: string;
    teamName: string;
    ownerName: string;
    position: number;
  } | null;
  isComplete: boolean;
}

interface DraftBoardProps {
  draftId: string;
}

export function DraftBoard({ draftId }: DraftBoardProps) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Initialize socket connection
    const newSocket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3007', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to draft socket');
      setIsConnected(true);
      
      // Join the draft room
      newSocket.emit('join_draft', draftId, session.user.id);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from draft socket');
      setIsConnected(false);
    });

    newSocket.on('draft_state', (state: DraftState) => {
      console.log('Received draft state:', state);
      setDraftState(state);
    });

    newSocket.on('pick_made', (data: any) => {
      console.log('Pick made:', data);
      // Refresh draft state
      fetchDraftState();
    });

    newSocket.on('auto_pick_made', (data: any) => {
      console.log('Auto pick made:', data);
      // Refresh draft state
      fetchDraftState();
    });

    newSocket.on('timer_update', (data: any) => {
      if (draftState) {
        setDraftState(prev => prev ? { ...prev, timeRemaining: data.timeRemaining } : null);
      }
    });

    newSocket.on('draft_started', () => {
      fetchDraftState();
    });

    newSocket.on('draft_paused', () => {
      fetchDraftState();
    });

    newSocket.on('draft_resumed', () => {
      fetchDraftState();
    });

    newSocket.on('error', (error: any) => {
      console.error('Draft socket error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [draftId, session?.user?.id]);

  const fetchDraftState = async () => {
    try {
      const response = await fetch(`/api/draft?draftId=${draftId}`);
      if (response.ok) {
        const data = await response.json();
        setDraftState(data.data.draft);
      }
    } catch (error) {
      console.error('Error fetching draft state:', error);
    }
  };

  const fetchAvailablePlayers = async () => {
    try {
      const response = await fetch('/api/players?available=true&limit=50');
      if (response.ok) {
        const data = await response.json();
        setAvailablePlayers(data.data.players || []);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const makePick = async (playerId: string) => {
    if (!draftState || !session?.user?.id || !socket) return;

    const userTeam = draftState.participants.find(p => p.ownerId === session.user.id);
    if (!userTeam || userTeam.teamId !== draftState.currentTeam?.teamId) {
      alert('It is not your turn to pick!');
      return;
    }

    try {
      socket.emit('make_pick', {
        draftId,
        round: draftState.currentRound,
        pick: draftState.currentPick,
        overall: (draftState.currentRound - 1) * draftState.participants.length + draftState.currentPick,
        teamId: userTeam.teamId,
        playerId,
        userId: session.user.id
      });

      setSelectedPlayer('');
    } catch (error) {
      console.error('Error making pick:', error);
    }
  };

  const controlDraft = async (action: 'start' | 'pause' | 'resume' | 'cancel') => {
    try {
      const response = await fetch(`/api/draft/${draftId}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Draft ${action}ed:`, data);
        
        // Emit socket event for real-time updates
        if (socket) {
          socket.emit(`${action}_draft`, draftId);
        }
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error(`Error ${action}ing draft:`, error);
    }
  };

  useEffect(() => {
    fetchAvailablePlayers();
  }, []);

  if (!draftState) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading draft...</div>
        </CardContent>
      </Card>
    );
  }

  const userTeam = draftState.participants.find(p => p.ownerId === session?.user?.id);
  const isUserTurn = userTeam?.teamId === draftState.currentTeam?.teamId;
  const isCommissioner = true; // Would need to check actual permissions

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Draft Board</span>
            <div className="flex gap-2">
              <Badge variant={isConnected ? 'default' : 'danger'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              <Badge variant="outline">{draftState.status}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{draftState.currentRound}</div>
              <div className="text-sm text-muted-foreground">Round</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{draftState.currentPick}</div>
              <div className="text-sm text-muted-foreground">Pick</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{draftState.timeRemaining}s</div>
              <div className="text-sm text-muted-foreground">Remaining</div>
            </div>
          </div>

          {draftState.currentTeam && (
            <div className="text-center mb-4">
              <div className="text-lg font-semibold">
                Current Pick: {draftState.currentTeam.teamName}
                {isUserTurn && <span className="text-green-600 ml-2">(Your Turn!)</span>}
              </div>
            </div>
          )}

          {isCommissioner && (
            <div className="flex gap-2 justify-center mb-4">
              {draftState.status === 'SCHEDULED' && (
                <Button onClick={() => controlDraft('start')}>Start Draft</Button>
              )}
              {draftState.status === 'IN_PROGRESS' && (
                <Button onClick={() => controlDraft('pause')} variant="outline">Pause Draft</Button>
              )}
              {draftState.status === 'PAUSED' && (
                <Button onClick={() => controlDraft('resume')}>Resume Draft</Button>
              )}
              {['SCHEDULED', 'IN_PROGRESS', 'PAUSED'].includes(draftState.status) && (
                <Button onClick={() => controlDraft('cancel')} variant="danger">Cancel Draft</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isUserTurn && draftState.status === 'IN_PROGRESS' && (
        <Card>
          <CardHeader>
            <CardTitle>Make Your Pick</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <select 
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a player...</option>
                {availablePlayers
                  .filter(player => !draftState.picks.some(pick => pick.player.id === player.id))
                  .slice(0, 20)
                  .map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} - {player.position} ({player.nflTeam})
                    </option>
                  ))}
              </select>
              <Button 
                onClick={() => makePick(selectedPlayer)}
                disabled={!selectedPlayer}
                className="w-full"
              >
                Make Pick
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Draft Picks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {draftState.picks.map(pick => (
              <div key={pick.id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <span className="font-semibold">#{pick.pickNumber}</span>
                  <span className="ml-2">{pick.player.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {pick.player.position} - {pick.player.nflTeam}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {pick.teamName}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}