import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useDraftRoom } from '@/lib/socket/client';
import { DraftBoard } from './DraftBoard';
// import PlayerList from './PlayerList';
// import TeamRoster from './TeamRoster';
// import DraftChat from './DraftChat';

// Temporary stub components
interface PlayerListProps {
  players: any[];
  selectedPlayer: any;
  onSelectPlayer: (player: any) => void;
  isMyTurn: boolean;
}

interface TeamRosterProps {
  team: any;
  roster: any[];
}

interface DraftChatProps {
  messages: any[];
  draftId: string;
}

const PlayerList = ({ players, selectedPlayer, onSelectPlayer, isMyTurn }: PlayerListProps) => (
  <div>Player List Component</div>
);

const TeamRoster = ({ team, roster }: TeamRosterProps) => (
  <div>Team Roster Component</div>
);

const DraftChat = ({ messages, draftId }: DraftChatProps) => (
  <div>Draft Chat Component</div>
);
import DraftTimer from './DraftTimer';
import { toast } from 'react-hot-toast';

interface DraftRoomProps {
  draftId: string;
}

export default function DraftRoom({ draftId }: DraftRoomProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { draftState, chatMessages, onlineUsers } = useDraftRoom(draftId);
  
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [draftData, setDraftData] = useState<any>(null);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');

  // Fetch initial draft data
  useEffect(() => {
    fetchDraftData();
    fetchAvailablePlayers();
  }, [draftId]);

  const fetchDraftData = async () => {
    try {
      const response = await fetch(`/api/draft/${draftId}`);
      if (!response.ok) throw new Error('Failed to fetch draft data');
      const data = await response.json();
      setDraftData(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching draft data:', error);
      toast.error('Failed to load draft');
      setIsLoading(false);
    }
  };

  const fetchAvailablePlayers = async () => {
    try {
      const params = new URLSearchParams({
        position: positionFilter,
        search: searchQuery,
        limit: '200'
      });
      
      const response = await fetch(`/api/draft/${draftId}/available-players?${params}`);
      if (!response.ok) throw new Error('Failed to fetch players');
      const data = await response.json();
      setAvailablePlayers(data.players);
    } catch (error) {
      console.error('Error fetching available players:', error);
      toast.error('Failed to load available players');
    }
  };

  // Refetch available players when filters change
  useEffect(() => {
    if (draftId) {
      fetchAvailablePlayers();
    }
  }, [positionFilter, searchQuery, draftState?.picks]);

  const handleMakePick = async () => {
    if (!selectedPlayer) {
      toast.error('Please select a player');
      return;
    }

    if (draftState?.currentTeamId !== draftData?.userTeam?.id) {
      toast.error('Not your turn to pick');
      return;
    }

    try {
      const response = await fetch(`/api/draft/${draftId}/make-pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          playerId: selectedPlayer.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to make pick');
      }

      toast.success(`Drafted ${selectedPlayer.name}!`);
      setSelectedPlayer(null);
      fetchAvailablePlayers();
    } catch (error) {
      console.error('Error making pick:', error);
      toast.error(error.message || 'Failed to make pick');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading draft room...</p>
        </div>
      </div>
    );
  }

  if (!draftData || !draftState) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600">Failed to load draft room</p>
          <button
            onClick={() => router.push('/leagues')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Leagues
          </button>
        </div>
      </div>
    );
  }

  const isMyTurn = draftState.currentTeamId === draftData.userTeam?.id;
  const currentTeam = draftState.teams.find(t => t.id === draftState.currentTeamId);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">
              {draftData.draft.league.name} Draft
            </h1>
            <span className="text-sm text-gray-600">
              Round {draftState.currentRound} • Pick {draftState.currentPick}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <DraftTimer 
              timeRemaining={draftState.timeRemaining}
              isMyTurn={isMyTurn}
            />
            
            {isMyTurn && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-blue-600">Your turn!</span>
                <button
                  onClick={handleMakePick}
                  disabled={!selectedPlayer}
                  className={`px-4 py-2 rounded font-medium ${
                    selectedPlayer
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Draft {selectedPlayer?.name || 'Select Player'}
                </button>
              </div>
            )}
            
            {!isMyTurn && currentTeam && (
              <span className="text-sm text-gray-600">
                On the clock: <span className="font-medium">{currentTeam.name}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Draft Board */}
        <div className="w-1/3 bg-white border-r overflow-y-auto">
          <DraftBoard draftId={draftId} />
        </div>

        {/* Center Panel - Available Players */}
        <div className="flex-1 bg-white flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Positions</option>
                <option value="QB">QB</option>
                <option value="RB">RB</option>
                <option value="WR">WR</option>
                <option value="TE">TE</option>
                <option value="K">K</option>
                <option value="DEF">DEF</option>
              </select>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <PlayerList
              players={availablePlayers}
              selectedPlayer={selectedPlayer}
              onSelectPlayer={setSelectedPlayer}
              isMyTurn={isMyTurn}
            />
          </div>
        </div>

        {/* Right Panel - Team Roster & Chat */}
        <div className="w-1/3 bg-white border-l flex flex-col">
          <div className="flex-1 overflow-y-auto border-b">
            <TeamRoster
              team={draftData.userTeam}
              roster={draftState.teams.find(t => t.id === draftData.userTeam?.id)?.roster || []}
            />
          </div>
          
          <div className="h-1/3">
            <DraftChat
              messages={chatMessages}
              draftId={draftId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}