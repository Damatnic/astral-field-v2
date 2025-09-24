'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Trophy,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const TEAMS = [
  { id: 1, name: "Nicholas D'Amato", email: "nicholas.damato@astralfield.com", team: "Astral Commanders", role: "Commissioner" },
  { id: 2, name: "Nick Hartley", email: "nick.hartley@astralfield.com", team: "Hartley's Heroes", role: "Manager" },
  { id: 3, name: "Jack McCaigue", email: "jack.mccaigue@astralfield.com", team: "Jack Attack", role: "Manager" },
  { id: 4, name: "Larry McCaigue", email: "larry.mccaigue@astralfield.com", team: "Larry's Legends", role: "Manager" },
  { id: 5, name: "Renee McCaigue", email: "renee.mccaigue@astralfield.com", team: "Renee's Raiders", role: "Manager" },
  { id: 6, name: "Jon Kornbeck", email: "jon.kornbeck@astralfield.com", team: "Kornbeck's Crushers", role: "Manager" },
  { id: 7, name: "David Jarvey", email: "david.jarvey@astralfield.com", team: "Jarvey's Juggernauts", role: "Manager" },
  { id: 8, name: "Kaity Lorbecki", email: "kaity.lorbecki@astralfield.com", team: "Kaity's Knights", role: "Manager" },
  { id: 9, name: "Cason Minor", email: "cason.minor@astralfield.com", team: "Minor League Majors", role: "Manager" },
  { id: 10, name: "Brittany Bergum", email: "brittany.bergum@astralfield.com", team: "Bergum's Ballers", role: "Manager" }
];

const TeamCard = ({ team, onQuickLogin, isLoading }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleClick = async () => {
    setIsLoggingIn(true);
    await onQuickLogin(team);
    setIsLoggingIn(false);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading || isLoggingIn}
      className={`
        p-4 rounded-lg border-2 text-left transition-all relative
        ${isLoggingIn 
          ? 'border-blue-500 bg-blue-50 scale-95' 
          : isHovered 
            ? 'border-blue-400 bg-gray-50 shadow-lg scale-105' 
            : 'border-gray-300 bg-white hover:shadow-md'
        }
        ${(isLoading || isLoggingIn) ? 'opacity-75 cursor-wait' : 'cursor-pointer'}
      `}
    >
      {/* Commissioner Badge */}
      {team.role === 'Commissioner' && (
        <div className="absolute -top-2 -right-2">
          <Shield className="w-6 h-6 text-yellow-500 fill-yellow-100" />
        </div>
      )}

      {/* Loading Indicator */}
      {isLoggingIn && (
        <div className="absolute top-2 right-2">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`
          w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold
          ${team.role === 'Commissioner' 
            ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' 
            : 'bg-gradient-to-br from-blue-500 to-blue-700'
          }
        `}>
          {team.name.split(' ').map((n: string) => n[0]).join('')}
        </div>

        {/* Team Info */}
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{team.name}</p>
          <p className="text-sm text-gray-700 font-medium">{team.team}</p>
          {isHovered && !isLoggingIn && (
            <p className="text-xs text-blue-600 mt-1 font-medium">
              Click to sign in →
            </p>
          )}
          {isLoggingIn && (
            <p className="text-xs text-blue-600 mt-1 font-medium">
              Signing in...
            </p>
          )}
        </div>
      </div>
    </button>
  );
};

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleQuickLogin = async (team: any) => {
    console.log('Quick login for:', team.name);
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      // Quick sign-in with default password
      const response = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          email: team.email,
          password: 'Dynasty2025'  // Default password for all users
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Verify session
        const sessionCheck = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        const sessionData = await sessionCheck.json();
        
        if (sessionCheck.ok && sessionData.success) {
          setSuccessMessage(`Welcome back, ${team.name}!`);
          // Short delay for success message
          await new Promise(resolve => setTimeout(resolve, 800));
          // Redirect to dashboard
          window.location.href = '/dashboard';
        } else {
          setError('Session creation failed. Please try again.');
        }
      } else {
        setError(data.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
            <Trophy className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          AstralField Dynasty League
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Select your team to sign in
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl px-4">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border-2 border-green-400 rounded-lg flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-400 rounded-lg flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">{error}</span>
          </div>
        )}

        {/* Team Cards Grid */}
        <div className="bg-white/90 backdrop-blur rounded-xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
            🏈 10-Team Dynasty League - 2025 Season
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TEAMS.map(team => (
              <TeamCard
                key={team.id}
                team={team}
                onQuickLogin={handleQuickLogin}
                isLoading={loading}
              />
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Quick sign-in enabled • Default password: Dynasty2025!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}