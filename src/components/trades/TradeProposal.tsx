import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { XMarkIcon, PlusIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  imageUrl?: string;
  projectedPoints?: number;
  adp?: number;
  positionRank?: number;
}

interface Team {
  id: string;
  name: string;
  owner: string;
}

interface TradeProposalProps {
  leagueId: string;
  myTeam: Team;
  otherTeams: Team[];
  onClose: () => void;
  onTradeProposed: () => void;
}

export default function TradeProposal({
  leagueId,
  myTeam,
  otherTeams,
  onClose,
  onTradeProposed
}: TradeProposalProps) {
  const { data: session } = useSession();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [myRoster, setMyRoster] = useState<Player[]>([]);
  const [theirRoster, setTheirRoster] = useState<Player[]>([]);
  const [givingPlayers, setGivingPlayers] = useState<Player[]>([]);
  const [receivingPlayers, setReceivingPlayers] = useState<Player[]>([]);
  const [message, setMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch my roster
  useEffect(() => {
    fetchRoster(myTeam.id, setMyRoster);
  }, [myTeam.id]);

  // Fetch selected team's roster
  useEffect(() => {
    if (selectedTeam) {
      fetchRoster(selectedTeam.id, setTheirRoster);
    } else {
      setTheirRoster([]);
      setReceivingPlayers([]);
    }
  }, [selectedTeam]);

  // Analyze trade when players change
  useEffect(() => {
    if (givingPlayers.length > 0 || receivingPlayers.length > 0) {
      analyzeTrade();
    } else {
      setAnalysis(null);
    }
  }, [givingPlayers, receivingPlayers]);

  const fetchRoster = async (teamId: string, setSetter: (players: Player[]) => void) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/roster`);
      if (response.ok) {
        const data = await response.json();
        setSetter(data.roster);
      }
    } catch (error) {
      console.error('Error fetching roster:', error);
    }
  };

  const analyzeTrade = async () => {
    if (!selectedTeam || (givingPlayers.length === 0 && receivingPlayers.length === 0)) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/trades/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromTeamId: myTeam.id,
          toTeamId: selectedTeam.id,
          givingPlayerIds: givingPlayers.map(p => p.id),
          receivingPlayerIds: receivingPlayers.map(p => p.id),
          leagueId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Error analyzing trade:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProposeTrade = async () => {
    if (!selectedTeam || givingPlayers.length === 0 || receivingPlayers.length === 0) {
      toast.error('Please select players from both teams');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/trades/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromTeamId: myTeam.id,
          toTeamId: selectedTeam.id,
          givingPlayerIds: givingPlayers.map(p => p.id),
          receivingPlayerIds: receivingPlayers.map(p => p.id),
          message,
          leagueId
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Trade proposal sent!');
        onTradeProposed();
        onClose();
      } else {
        toast.error(data.error || 'Failed to propose trade');
      }
    } catch (error) {
      console.error('Error proposing trade:', error);
      toast.error('Failed to propose trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addToGiving = (player: Player) => {
    if (!givingPlayers.find(p => p.id === player.id)) {
      setGivingPlayers([...givingPlayers, player]);
    }
  };

  const removeFromGiving = (playerId: string) => {
    setGivingPlayers(givingPlayers.filter(p => p.id !== playerId));
  };

  const addToReceiving = (player: Player) => {
    if (!receivingPlayers.find(p => p.id === player.id)) {
      setReceivingPlayers([...receivingPlayers, player]);
    }
  };

  const removeFromReceiving = (playerId: string) => {
    setReceivingPlayers(receivingPlayers.filter(p => p.id !== playerId));
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'ACCEPT': return 'text-green-600';
      case 'CONSIDER': return 'text-yellow-600';
      case 'NEGOTIATE': return 'text-orange-600';
      case 'REJECT': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'ACCEPT': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'CONSIDER': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'NEGOTIATE': return <ArrowsRightLeftIcon className="h-5 w-5 text-orange-500" />;
      case 'REJECT': return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Propose Trade</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Team Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trade With:
            </label>
            <select
              value={selectedTeam?.id || ''}
              onChange={(e) => {
                const team = otherTeams.find(t => t.id === e.target.value);
                setSelectedTeam(team || null);
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a team...</option>
              {otherTeams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.owner})
                </option>
              ))}
            </select>
          </div>

          {selectedTeam && (
            <>
              {/* Trade Builder */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* My Team */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">{myTeam.name} Gives</h3>
                  
                  {/* Selected Players */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 min-h-[100px]">
                    {givingPlayers.length === 0 ? (
                      <p className="text-gray-500 text-sm">Select players to trade away...</p>
                    ) : (
                      <div className="space-y-2">
                        {givingPlayers.map(player => (
                          <div key={player.id} className="flex justify-between items-center bg-white rounded p-2">
                            <div>
                              <span className="font-medium">{player.name}</span>
                              <span className="ml-2 text-sm text-gray-600">
                                {player.position} - {player.team}
                              </span>
                            </div>
                            <button
                              onClick={() => removeFromGiving(player.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Roster */}
                  <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                    {myRoster.filter(p => !givingPlayers.find(gp => gp.id === p.id)).map(player => (
                      <div
                        key={player.id}
                        className="flex justify-between items-center p-3 hover:bg-gray-50 border-b"
                      >
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-gray-600">
                            {player.position} - {player.team}
                          </div>
                        </div>
                        <button
                          onClick={() => addToGiving(player)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <PlusIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Other Team */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">{selectedTeam.name} Gives</h3>
                  
                  {/* Selected Players */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 min-h-[100px]">
                    {receivingPlayers.length === 0 ? (
                      <p className="text-gray-500 text-sm">Select players to receive...</p>
                    ) : (
                      <div className="space-y-2">
                        {receivingPlayers.map(player => (
                          <div key={player.id} className="flex justify-between items-center bg-white rounded p-2">
                            <div>
                              <span className="font-medium">{player.name}</span>
                              <span className="ml-2 text-sm text-gray-600">
                                {player.position} - {player.team}
                              </span>
                            </div>
                            <button
                              onClick={() => removeFromReceiving(player.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Roster */}
                  <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                    {theirRoster.filter(p => !receivingPlayers.find(rp => rp.id === p.id)).map(player => (
                      <div
                        key={player.id}
                        className="flex justify-between items-center p-3 hover:bg-gray-50 border-b"
                      >
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-gray-600">
                            {player.position} - {player.team}
                          </div>
                        </div>
                        <button
                          onClick={() => addToReceiving(player)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <PlusIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trade Analysis */}
              {analysis && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold mb-3">Trade Analysis</h3>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">You Give</p>
                      <p className="text-2xl font-bold text-red-600">
                        {analysis.givingValue.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Difference</p>
                      <p className={`text-2xl font-bold ${analysis.valueDifference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analysis.valueDifference > 0 ? '+' : ''}{analysis.valueDifference.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">You Receive</p>
                      <p className="text-2xl font-bold text-green-600">
                        {analysis.receivingValue.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center mb-3">
                    {getRecommendationIcon(analysis.recommendation)}
                    <span className={`ml-2 font-semibold ${getRecommendationColor(analysis.recommendation)}`}>
                      Recommendation: {analysis.recommendation}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {analysis.reasoning.map((reason: string, index: number) => (
                      <p key={index} className="text-sm text-gray-700">• {reason}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a message to your trade proposal..."
                />
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleProposeTrade}
            disabled={!selectedTeam || givingPlayers.length === 0 || receivingPlayers.length === 0 || isSubmitting}
            className={`px-4 py-2 text-white rounded ${
              !selectedTeam || givingPlayers.length === 0 || receivingPlayers.length === 0 || isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? 'Proposing...' : 'Propose Trade'}
          </button>
        </div>
      </div>
    </div>
  );
}