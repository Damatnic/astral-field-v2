'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowRightLeft, Check, X, Clock, AlertCircle, 
  Plus, Eye, Send, Users, Trophy, TrendingUp, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

interface Trade {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  type: 'sent' | 'received';
  from: {
    name: string;
    owner: string;
    players: { name: string; position: string; team: string; }[];
  };
  to: {
    name: string;
    owner: string;
    players: { name: string; position: string; team: string; }[];
  };
  proposedAt: string;
  expiresAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
}

interface TradeResponse {
  success: boolean;
  trades?: Trade[];
  error?: string;
}

// Mock trade data for fallback
const fallbackTrades: Trade[] = [
  {
    id: '1',
    status: 'pending',
    type: 'received',
    from: {
      name: 'Team Alpha',
      owner: 'John Smith',
      players: [
        { name: 'Austin Ekeler', position: 'RB', team: 'LAC' },
        { name: 'Mike Evans', position: 'WR', team: 'TB' }
      ]
    },
    to: {
      name: 'Your Team',
      owner: 'You',
      players: [
        { name: 'Saquon Barkley', position: 'RB', team: 'NYG' }
      ]
    },
    proposedAt: '2024-01-15T10:30:00Z',
    expiresAt: '2024-01-18T10:30:00Z'
  },
  {
    id: '2',
    status: 'accepted',
    type: 'sent',
    from: {
      name: 'Your Team',
      owner: 'You',
      players: [
        { name: 'DeAndre Hopkins', position: 'WR', team: 'TEN' }
      ]
    },
    to: {
      name: 'Power Squad',
      owner: 'Jane Doe',
      players: [
        { name: 'Alvin Kamara', position: 'RB', team: 'NO' }
      ]
    },
    proposedAt: '2024-01-10T14:20:00Z',
    acceptedAt: '2024-01-11T09:15:00Z'
  },
  {
    id: '3',
    status: 'rejected',
    type: 'sent',
    from: {
      name: 'Your Team',
      owner: 'You',
      players: [
        { name: 'Davante Adams', position: 'WR', team: 'LV' },
        { name: 'Tyler Higbee', position: 'TE', team: 'LAR' }
      ]
    },
    to: {
      name: 'Elite Team',
      owner: 'Mike Johnson',
      players: [
        { name: 'Josh Allen', position: 'QB', team: 'BUF' }
      ]
    },
    proposedAt: '2024-01-08T16:45:00Z',
    rejectedAt: '2024-01-09T11:30:00Z'
  }
];

const TradeCard = ({ trade, onAccept, onReject }: { trade: Trade; onAccept?: (id: string) => void; onReject?: (id: string) => void; }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'accepted': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'expired': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'accepted': return <Check className="w-4 h-4" />;
      case 'rejected': return <X className="w-4 h-4" />;
      case 'expired': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'QB': return 'bg-pink-100 text-pink-700';
      case 'RB': return 'bg-blue-100 text-blue-700';
      case 'WR': return 'bg-green-100 text-green-700';
      case 'TE': return 'bg-orange-100 text-orange-700';
      case 'K': return 'bg-purple-100 text-purple-700';
      case 'DST': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(trade.status)}`}>
              {getStatusIcon(trade.status)}
              {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
            </span>
            <span className="text-xs text-gray-500">
              {trade.type === 'received' ? 'Received' : 'Sent'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {new Date(trade.proposedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Trade Details */}
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* From */}
          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">{trade.from.name}</p>
            <div className="space-y-1">
              {trade.from.players.map((player: any, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 text-xs rounded ${getPositionColor(player.position)}`}>
                    {player.position}
                  </span>
                  <span className="text-xs text-gray-700">{player.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRightLeft className="w-6 h-6 text-gray-400" />
          </div>

          {/* To */}
          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">{trade.to.name}</p>
            <div className="space-y-1">
              {trade.to.players.map((player: any, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 text-xs rounded ${getPositionColor(player.position)}`}>
                    {player.position}
                  </span>
                  <span className="text-xs text-gray-700">{player.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        {trade.status === 'pending' && trade.type === 'received' && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            <Button 
              size="sm" 
              className="btn-primary flex-1"
              onClick={() => onAccept?.(trade.id)}
            >
              <Check className="w-4 h-4 mr-1" />
              Accept
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => onReject?.(trade.id)}
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        )}

        {trade.status === 'pending' && trade.type === 'sent' && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            <Button size="sm" variant="outline" className="flex-1">
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function TradesPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch trades on component mount
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await fetch('/api/trades');
        const data: TradeResponse = await response.json();
        
        if (data.success && data.trades) {
          setTrades(data.trades);
        } else {
          console.warn('No trades found, using fallback data');
          setTrades(fallbackTrades);
        }
      } catch (error) {
        console.error('Error fetching trades:', error);
        setTrades(fallbackTrades);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTrades();
    } else {
      setLoading(false);
    }
  }, [user]);

  const filteredTrades = trades.filter(trade => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return trade.status === 'pending';
    if (activeTab === 'received') return trade.type === 'received';
    if (activeTab === 'sent') return trade.type === 'sent';
    return true;
  });

  const tabs = [
    { id: 'all', label: 'All Trades', count: trades.length },
    { id: 'pending', label: 'Pending', count: trades.filter(t => t.status === 'pending').length },
    { id: 'received', label: 'Received', count: trades.filter(t => t.type === 'received').length },
    { id: 'sent', label: 'Sent', count: trades.filter(t => t.type === 'sent').length }
  ];

  const handleAcceptTrade = async (tradeId: string) => {
    try {
      const response = await fetch(`/api/trades/${tradeId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTrades(trades.map(t => 
          t.id === tradeId 
            ? { ...t, status: 'accepted' as const, acceptedAt: new Date().toISOString() }
            : t
        ));
        toast.success('Trade accepted successfully!');
      } else {
        toast.error(data.error || 'Failed to accept trade');
      }
    } catch (error) {
      console.error('Error accepting trade:', error);
      toast.error('Failed to accept trade');
    }
  };

  const handleRejectTrade = async (tradeId: string) => {
    try {
      const response = await fetch(`/api/trades/${tradeId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTrades(trades.map(t => 
          t.id === tradeId 
            ? { ...t, status: 'rejected' as const, rejectedAt: new Date().toISOString() }
            : t
        ));
        toast.success('Trade rejected');
      } else {
        toast.error(data.error || 'Failed to reject trade');
      }
    } catch (error) {
      console.error('Error rejecting trade:', error);
      toast.error('Failed to reject trade');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h1>
          <p className="text-gray-600">Please log in to view and manage trades.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Trades</h1>
              <p className="text-gray-600 mt-1">Manage your trade proposals and offers</p>
            </div>
            <Button 
              className="btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Propose Trade
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Trade Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-xs text-orange-600 font-medium">Active</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {trades.filter(t => t.status === 'pending').length}
              </p>
              <p className="text-sm text-gray-600">Pending Trades</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-xs text-green-600 font-medium">Success</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {trades.filter(t => t.status === 'accepted').length}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <Send className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">Outgoing</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {trades.filter(t => t.type === 'sent').length}
              </p>
              <p className="text-sm text-gray-600">Proposals Sent</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">85%</p>
              <p className="text-sm text-gray-600">Success Rate</p>
            </div>
          </div>
        </div>

        {/* Trades List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading trades...</p>
          </div>
        ) : filteredTrades.length > 0 ? (
          <div className="space-y-4">
            {filteredTrades.map((trade) => (
              <TradeCard key={trade.id} trade={trade} onAccept={handleAcceptTrade} onReject={handleRejectTrade} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ArrowRightLeft className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No trades found</h3>
            <p className="text-gray-600 mb-4">
              {activeTab === 'all' 
                ? 'You haven\'t made any trades yet.' 
                : `No ${activeTab} trades found.`}
            </p>
            <Button 
              className="btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Propose Your First Trade
            </Button>
          </div>
        )}
      </main>

      {/* Simple Trade Creation Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Trade Proposal</h3>
            <p className="text-gray-600 mb-4">
              Full trade creation functionality coming soon! For now, you can view and manage existing trades.
            </p>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Close
              </Button>
              <Button 
                className="btn-primary"
                onClick={() => {
                  setShowCreateForm(false);
                  toast.info('Trade creation feature coming soon!');
                }}
              >
                Coming Soon
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}