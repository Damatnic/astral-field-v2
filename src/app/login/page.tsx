'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trophy, LogIn, Users, Shield, User, ChevronRight, Check, Star } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// League member accounts with proper team associations
const leagueAccounts = [
  {
    id: 1,
    email: 'nick@astralfield.com',
    password: 'Astral2025!',
    name: 'Nick Hartley',
    teamName: 'Hartley Heroes',
    role: 'Team Owner',
    avatar: 'NH',
    color: 'bg-blue-500',
    wins: 8,
    losses: 5,
    rank: 3,
    lastActive: '2 hours ago'
  },
  {
    id: 2,
    email: 'jack@astralfield.com',
    password: 'Astral2025!',
    name: 'Jack McCaigue',
    teamName: 'McCaigue Mayhem',
    role: 'Team Owner',
    avatar: 'JM',
    color: 'bg-green-500',
    wins: 10,
    losses: 3,
    rank: 1,
    lastActive: '1 hour ago',
    isChampion: true
  },
  {
    id: 3,
    email: 'larry@astralfield.com',
    password: 'Astral2025!',
    name: 'Larry McCaigue',
    teamName: 'Larry\'s Legends',
    role: 'Team Owner',
    avatar: 'LM',
    color: 'bg-purple-500',
    wins: 7,
    losses: 6,
    rank: 5,
    lastActive: '5 hours ago'
  },
  {
    id: 4,
    email: 'renee@astralfield.com',
    password: 'Astral2025!',
    name: 'Renee McCaigue',
    teamName: 'Renee\'s Reign',
    role: 'Team Owner',
    avatar: 'RM',
    color: 'bg-pink-500',
    wins: 9,
    losses: 4,
    rank: 2,
    lastActive: 'Yesterday'
  },
  {
    id: 5,
    email: 'jon@astralfield.com',
    password: 'Astral2025!',
    name: 'Jon Kornbeck',
    teamName: 'Kornbeck Crushers',
    role: 'Team Owner',
    avatar: 'JK',
    color: 'bg-indigo-500',
    wins: 6,
    losses: 7,
    rank: 6,
    lastActive: '3 hours ago'
  },
  {
    id: 6,
    email: 'david@astralfield.com',
    password: 'Astral2025!',
    name: 'David Jarvey',
    teamName: 'Jarvey\'s Juggernauts',
    role: 'Team Owner',
    avatar: 'DJ',
    color: 'bg-red-500',
    wins: 8,
    losses: 5,
    rank: 4,
    lastActive: 'Today'
  },
  {
    id: 7,
    email: 'kaity@astralfield.com',
    password: 'Astral2025!',
    name: 'Kaity Lorbecki',
    teamName: 'Lorbecki Lions',
    role: 'Team Owner',
    avatar: 'KL',
    color: 'bg-yellow-500',
    wins: 5,
    losses: 8,
    rank: 8,
    lastActive: '6 hours ago'
  },
  {
    id: 8,
    email: 'cason@astralfield.com',
    password: 'Astral2025!',
    name: 'Cason Minor',
    teamName: 'Minor Miracles',
    role: 'Team Owner',
    avatar: 'CM',
    color: 'bg-teal-500',
    wins: 4,
    losses: 9,
    rank: 9,
    lastActive: '2 days ago'
  },
  {
    id: 9,
    email: 'brittany@astralfield.com',
    password: 'Astral2025!',
    name: 'Brittany Bergum',
    teamName: 'Bergum Blitz',
    role: 'Team Owner',
    avatar: 'BB',
    color: 'bg-orange-500',
    wins: 6,
    losses: 7,
    rank: 7,
    lastActive: 'Today'
  },
  {
    id: 10,
    email: 'nicholas@astralfield.com',
    password: 'Astral2025!',
    name: 'Nicholas D\'Amato',
    teamName: 'D\'Amato Dynasty',
    role: 'Commissioner & Owner',
    avatar: 'ND',
    color: 'bg-gradient-to-br from-purple-600 to-blue-600',
    wins: 7,
    losses: 6,
    rank: 4,
    lastActive: 'Just now',
    isCommissioner: true,
    isOwner: true
  }
];

// Special accounts
const specialAccounts = [
  {
    id: 99,
    email: 'demo@astralfield.com',
    password: 'demo123',
    name: 'Demo User',
    teamName: 'Demo Team',
    role: 'Demo Account',
    avatar: 'DU',
    color: 'bg-gray-500',
    isDemo: true
  },
  {
    id: 100,
    email: 'admin@astralfield.com',
    password: 'admin123',
    name: 'Admin',
    teamName: 'System Admin',
    role: 'Administrator',
    avatar: 'AD',
    color: 'bg-black',
    isAdmin: true
  }
];

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<typeof leagueAccounts[0] | null>(null);
  const [showManualLogin, setShowManualLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSpecialAccounts, setShowSpecialAccounts] = useState(false);

  const handleAccountSelect = (account: typeof leagueAccounts[0]) => {
    setSelectedAccount(account);
    setError('');
  };

  const handleQuickLogin = async () => {
    if (!selectedAccount) return;
    
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedAccount.email,
          password: selectedAccount.password,
          teamId: selectedAccount.id,
          teamName: selectedAccount.teamName
        }),
        credentials: 'include'
      });

      const data = await res.json();

      if (data.success) {
        // Store additional user info in session storage
        sessionStorage.setItem('currentUser', JSON.stringify({
          id: selectedAccount.id,
          name: selectedAccount.name,
          teamName: selectedAccount.teamName,
          role: selectedAccount.role,
          avatar: selectedAccount.avatar,
          color: selectedAccount.color
        }));
        
        router.push('/my-team');
        router.refresh();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      const data = await res.json();

      if (data.success) {
        router.push('/my-team');
        router.refresh();
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const allAccounts = showSpecialAccounts ? [...leagueAccounts, ...specialAccounts] : leagueAccounts;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-24 h-24 bg-gradient-to-br from-blue-600 to-green-600 rounded-full flex items-center justify-center shadow-lg">
            <Trophy className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Astral Field</h1>
          <p className="text-lg text-gray-600">D'Amato Dynasty League • 2025 Season</p>
        </div>

        {/* Main Content */}
        <Card className="shadow-2xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-t-xl">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription className="text-blue-100">
              {showManualLogin ? 'Sign in with your credentials' : 'Select your team to continue'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {!showManualLogin ? (
              <>
                {/* Account Selection List */}
                <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                  {allAccounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleAccountSelect(account)}
                      className={`w-full p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group ${
                        selectedAccount?.id === account.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                      disabled={isLoading}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className={`w-12 h-12 ${account.color} text-white rounded-full flex items-center justify-center font-bold relative`}>
                          {account.avatar}
                          {account.isChampion && (
                            <Star className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 fill-yellow-400" />
                          )}
                          {account.isCommissioner && (
                            <Shield className="absolute -top-1 -right-1 h-4 w-4 text-blue-400 fill-blue-400" />
                          )}
                        </div>

                        {/* Account Info */}
                        <div className="text-left">
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {account.name}
                            {account.isDemo && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">DEMO</span>
                            )}
                            {account.isAdmin && (
                              <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">ADMIN</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">{account.teamName}</div>
                          {account.wins !== undefined && (
                            <div className="text-xs text-gray-500 mt-1">
                              {account.wins}-{account.losses} • Rank #{account.rank}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      <div className="flex items-center gap-2">
                        {account.lastActive && (
                          <span className="text-xs text-gray-400 hidden sm:block">{account.lastActive}</span>
                        )}
                        {selectedAccount?.id === account.id ? (
                          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center">
                            <Check className="h-4 w-4" />
                          </div>
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="p-6 bg-gray-50 border-t">
                  {selectedAccount && (
                    <Button
                      onClick={handleQuickLogin}
                      disabled={isLoading}
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white mb-3"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Signing in...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <LogIn className="h-4 w-4" />
                          Sign in as {selectedAccount.name}
                        </span>
                      )}
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowManualLogin(true)}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Manual Login
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => setShowSpecialAccounts(!showSpecialAccounts)}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      {showSpecialAccounts ? 'Hide' : 'Show'} Special
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* Manual Login Form */
              <div className="p-6">
                <form onSubmit={handleManualLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <LogIn className="h-4 w-4" />
                        Sign In
                      </span>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowManualLogin(false)}
                    className="w-full"
                    disabled={isLoading}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Back to Team Selection
                  </Button>
                </form>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="px-6 pb-6">
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>10-Team Dynasty League • PPR Scoring • FAAB Waivers</p>
          <p className="mt-2">Week 15 of 17 • Playoffs Start Week 15</p>
        </div>
      </div>
    </div>
  );
}