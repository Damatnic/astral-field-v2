'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Trophy,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle
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

const TeamCard = ({ team, onSelect, isSelected }: any) => (
  <button
    onClick={() => onSelect(team)}
    className={`p-3 rounded-lg border text-left transition-all relative ${
      isSelected 
        ? 'border-field-green-500 bg-field-green-50' 
        : 'border-gray-200 bg-white hover:border-gray-300'
    }`}
  >
    {team.role === 'Commissioner' && (
      <span className="absolute top-2 right-2 px-2 py-1 text-xs bg-field-green-500 text-white rounded">
        Commissioner
      </span>
    )}
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-field-green-500 flex items-center justify-center text-white font-bold text-sm">
        {team.name.split(' ').map((n: string) => n[0]).join('')}
      </div>
      <div>
        <p className="font-medium text-gray-900 text-sm">{team.name}</p>
        <p className="text-xs text-gray-600">{team.team}</p>
      </div>
    </div>
  </button>
);

export default function LoginPage() {
  const router = useRouter();
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user selected a team from landing page
    const savedEmail = localStorage.getItem('selected_team_email');
    if (savedEmail) {
      const team = TEAMS.find(t => t.email === savedEmail);
      if (team) {
        setSelectedTeam(team);
        setEmail(team.email);
      }
      localStorage.removeItem('selected_team_email');
    }
  }, []);

  const handleTeamSelect = (team: any) => {
    setSelectedTeam(team);
    setEmail(team.email);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSignIn called');
    setError('');
    setLoading(true);

    try {
      // Authenticate with credentials
      const response = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({ 
          email: selectedTeam?.email || email,
          password: password || 'Dynasty2025!' 
        })
      });

      console.log('Login response:', response.status);
      const data = await response.json();
      console.log('Login data:', data);
      
      if (response.ok && data.success) {
        console.log('Login successful, checking session...');
        // Verify session was created by checking /api/auth/me
        const sessionCheck = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        const sessionData = await sessionCheck.json();
        console.log('Session check:', sessionData);
        
        if (sessionCheck.ok && sessionData.success) {
          console.log('Session valid, redirecting...');
          // Success animation
          await new Promise(resolve => setTimeout(resolve, 500));
          // Try different paths
          window.location.href = '/dashboard';
        } else {
          setError('Session creation failed');
        }
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-field-green-500 rounded-2xl flex items-center justify-center">
            <Trophy className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Fantasy Football League
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to manage your team
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="card">
          <div className="card-body">
            {!selectedTeam ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Your Team (10-Man League)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TEAMS.map(team => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      onSelect={handleTeamSelect}
                      isSelected={selectedTeam?.id === team.id}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-field-green-500 rounded-lg flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">
                    {selectedTeam.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">{selectedTeam.team}</h3>
                  <p className="text-sm text-gray-600">{selectedTeam.name}</p>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-field-green-500 focus:border-field-green-500"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-12 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-field-green-500 focus:border-field-green-500"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Default password: Dynasty2025!</p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-red-700 text-sm">{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>

                <button
                  onClick={() => setSelectedTeam(null)}
                  className="w-full text-sm text-gray-600 hover:text-gray-800"
                >
                  Choose Different Team
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}