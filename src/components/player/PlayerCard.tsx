'use client';

import { useState } from 'react';
import { PlayerCardProps, PlayerStatus } from '@/types/fantasy';
import { safeToFixed } from '@/utils/numberUtils';

export default function PlayerCard({
  player,
  isRostered = false,
  isAvailable = true,
  showActions = true,
  onAdd,
  onDrop,
  onTrade
}: PlayerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: PlayerStatus) => {
    switch (status) {
      case PlayerStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case PlayerStatus.QUESTIONABLE:
        return 'bg-yellow-100 text-yellow-800';
      case PlayerStatus.DOUBTFUL:
        return 'bg-orange-100 text-orange-800';
      case PlayerStatus.OUT:
      case PlayerStatus.INJURED_RESERVE:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'QB':
        return 'bg-purple-100 text-purple-800';
      case 'RB':
        return 'bg-green-100 text-green-800';
      case 'WR':
        return 'bg-blue-100 text-blue-800';
      case 'TE':
        return 'bg-yellow-100 text-yellow-800';
      case 'K':
        return 'bg-orange-100 text-orange-800';
      case 'DST':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: PlayerStatus) => {
    switch (status) {
      case PlayerStatus.QUESTIONABLE:
        return 'Q';
      case PlayerStatus.DOUBTFUL:
        return 'D';
      case PlayerStatus.OUT:
        return 'O';
      case PlayerStatus.INJURED_RESERVE:
        return 'IR';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {player.name}
            </h3>
            <p className="text-sm text-gray-600">
              {player.nflTeam} • {player.position}
              {player.byeWeek && ` • Bye: ${player.byeWeek}`}
            </p>
          </div>
          
          <div className="flex flex-col gap-1 ml-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPositionColor(player.position)}`}>
              {player.position}
            </span>
            {player.status !== PlayerStatus.ACTIVE && (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(player.status)}`}>
                {formatStatus(player.status)}
              </span>
            )}
          </div>
        </div>

        {/* Roster Status */}
        {isRostered && (
          <div className="mb-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Rostered
            </span>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-500">Avg Points</p>
            <p className="text-lg font-semibold text-gray-900">
              {safeToFixed(player.averagePoints, 1, '0.0')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Projection</p>
            <p className="text-lg font-semibold text-gray-900">
              {safeToFixed(player.projections?.[0]?.projectedPoints, 1, '0.0')}
            </p>
          </div>
        </div>

        {/* Recent News */}
        {player.news && player.news.length > 0 && (
          <div className="mb-3">
            <div className="bg-gray-50 rounded-md p-2">
              <p className="text-xs text-gray-600 line-clamp-2">
                {player.news[0].headline}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(player.news[0].timestamp).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Expandable Stats */}
        {player.weeklyStats && player.weeklyStats.length > 0 && (
          <div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:text-blue-800 mb-2"
            >
              {isExpanded ? 'Hide' : 'Show'} Recent Games
            </button>
            
            {isExpanded && (
              <div className="space-y-1">
                {player.weeklyStats.slice(0, 3).map((stat, index) => (
                  <div key={index} className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">
                      Week {stat.week} vs {stat.opponent}
                    </span>
                    <span className="font-medium text-gray-900">
                      {safeToFixed(stat.points, 1, '0.0')} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex gap-2">
            {isAvailable && onAdd && (
              <button
                onClick={() => onAdd(player.id)}
                className="flex-1 bg-green-600 text-white text-center py-2 px-3 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Add
              </button>
            )}
            
            {isRostered && onDrop && (
              <button
                onClick={() => onDrop(player.id)}
                className="flex-1 bg-red-600 text-white text-center py-2 px-3 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Drop
              </button>
            )}
            
            {onTrade && (
              <button
                onClick={() => onTrade(player.id)}
                className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Trade
              </button>
            )}
          </div>
        </div>
      )}

      {/* Player Details Link */}
      <div className="px-4 py-2 bg-gray-25">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          View Details →
        </button>
      </div>
    </div>
  );
}