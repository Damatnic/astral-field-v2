'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LeagueCardProps } from '@/types/fantasy';

export default function LeagueCard({ 
  league, 
  currentUserId, 
  onJoin, 
  onLeave 
}: LeagueCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isCommissioner = league.commissionerId === currentUserId;
  const userMember = league.members?.find(member => member.userId === currentUserId);
  const userTeam = league.teams?.find(team => team.ownerId === currentUserId);

  const getStatusBadge = () => {
    if (!league.isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Inactive
        </span>
      );
    }

    if (league.currentWeek && league.currentWeek > 17) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          Playoffs
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Week {league.currentWeek || 1}
      </span>
    );
  };

  const getRoleBadge = () => {
    if (isCommissioner) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Commissioner
        </span>
      );
    }

    if (userMember) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Member
        </span>
      );
    }

    return null;
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md ${
        isHovered ? 'transform hover:-translate-y-1' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <Link
              href={`/leagues/${league.id}`}
              className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              {league.name}
            </Link>
            {league.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {league.description}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1 ml-4">
            {getStatusBadge()}
            {getRoleBadge()}
          </div>
        </div>

        {/* League Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Teams</p>
            <p className="text-lg font-semibold text-gray-900">
              {league.teamCount}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Season</p>
            <p className="text-lg font-semibold text-gray-900">
              {league.season}
            </p>
          </div>
        </div>

        {/* Commissioner Info */}
        {league.commissioner && (
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
              {league.commissioner.avatar ? (
                <img
                  src={league.commissioner.avatar}
                  alt={league.commissioner.name || 'Commissioner'}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <span className="text-sm font-medium text-gray-600">
                  {(league.commissioner.name || league.commissioner.email || 'C')[0].toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {league.commissioner.name || 'Commissioner'}
              </p>
              <p className="text-xs text-gray-500">Commissioner</p>
            </div>
          </div>
        )}

        {/* User Team Info */}
        {userTeam && (
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-blue-900">{userTeam.name}</p>
                <p className="text-xs text-blue-700">
                  {userTeam.wins}-{userTeam.losses}
                  {userTeam.ties > 0 && `-${userTeam.ties}`}
                  {' • '}
                  {userTeam.pointsFor.toFixed(1)} pts
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-700">Your Team</p>
                <p className="text-sm font-semibold text-blue-900">
                  #{userTeam.standings?.rank || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* League Settings Preview */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>
              {league.settings?.waiverMode === 'FAAB' ? 'FAAB Waivers' : 
               league.settings?.waiverMode === 'ROLLING' ? 'Rolling Waivers' : 
               'Reverse Standings'}
            </span>
            <span>
              {league.settings?.rosterSlots?.QB || 1}QB • {league.settings?.rosterSlots?.RB || 2}RB • {league.settings?.rosterSlots?.WR || 2}WR
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex gap-2">
          <Link
            href={`/leagues/${league.id}`}
            className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            View League
          </Link>
          
          {isCommissioner && (
            <Link
              href={`/leagues/${league.id}/settings`}
              className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Settings
            </Link>
          )}
          
          {userTeam && (
            <Link
              href={`/teams/${userTeam.id}`}
              className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              My Team
            </Link>
          )}
        </div>
      </div>

      {/* Last Updated */}
      <div className="px-6 py-2 bg-gray-25">
        <p className="text-xs text-gray-500">
          Updated {new Date(league.updatedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}