'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trophy, LogIn, Users, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Dummy test accounts
const testAccounts = [
  { email: 'admin@test.com', password: 'admin123', name: 'Admin Account', role: 'Administrator', color: 'text-purple-600' },
  { email: 'commissioner@test.com', password: 'commish123', name: 'Commissioner', role: 'League Commissioner', color: 'text-blue-600' },
  { email: 'demo@test.com', password: 'demo123', name: 'Demo User', role: 'Demo Account', color: 'text-gray-600' },
  { email: 'player1@test.com', password: 'password123', name: 'Nick Hartley', role: 'Team Owner', color: 'text-green-600' },
  { email: 'player2@test.com', password: 'password123', name: 'Jack McCaigue', role: 'Team Owner', color: 'text-green-600' },
  { email: 'player3@test.com', password: 'password123', name: 'Larry McCaigue', role: 'Team Owner', color: 'text-green-600' },
  { email: 'player4@test.com', password: 'password123', name: 'Renee McCaigue', role: 'Team Owner', color: 'text-green-600' },
  { email: 'player5@test.com', password: 'password123', name: 'Jon Kornbeck', role: 'Team Owner', color: 'text-green-600' },
  { email: 'player6@test.com', password: 'password123', name: 'David Jarvey', role: 'Team Owner', color: 'text-green-600' },
  { email: 'player7@test.com', password: 'password123', name: 'Kaity Lorbecki', role: 'Team Owner', color: 'text-green-600' },
  { email: 'player8@test.com', password: 'password123', name: 'Cason Minor', role: 'Team Owner', color: 'text-green-600' },
  { email: 'player9@test.com', password: 'password123', name: 'Brittany Bergum', role: 'Team Owner', color: 'text-green-600' },
];

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQuickAccess, setShowQuickAccess] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');

  const handleQuickLogin = async (account: typeof testAccounts[0]) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: account.email,
          password: account.password
        }),
        credentials: 'include'
      });

      const data = await res.json();

      if (data.success) {
        router.push('/');
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
        router.push('/');
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

  const handleAccountSelect = (value: string) => {
    const account = testAccounts.find(acc => acc.email === value);
    if (account) {
      setEmail(account.email);
      setPassword(account.password);
      setSelectedAccount(value);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-blue-600 to-green-600 rounded-full flex items-center justify-center">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to Astral Field</CardTitle>
          <CardDescription className="text-base">
            D'Amato Dynasty League Fantasy Football
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Quick Access Section */}
          {showQuickAccess && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Quick Access</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickAccess(false)}
                  className="text-xs"
                >
                  Manual Login →
                </Button>
              </div>
              
              {/* Account Dropdown Selector */}
              <div className="space-y-3">
                <select 
                  onChange={(e) => handleAccountSelect(e.target.value)} 
                  value={selectedAccount}
                  className="w-full h-12 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a test account</option>
                  <optgroup label="Admin Accounts">
                    <option value="admin@test.com">Admin - Full system access</option>
                    <option value="commissioner@test.com">Commissioner - League management</option>
                  </optgroup>
                  <optgroup label="Test Account">
                    <option value="demo@test.com">Demo User - Try the platform</option>
                  </optgroup>
                  <optgroup label="Team Owners">
                    {testAccounts.filter(acc => acc.role === 'Team Owner').map(account => (
                      <option key={account.email} value={account.email}>
                        {account.name} - Team Owner
                      </option>
                    ))}
                  </optgroup>
                </select>

                {selectedAccount && (
                  <Button
                    onClick={() => {
                      const account = testAccounts.find(acc => acc.email === selectedAccount);
                      if (account) handleQuickLogin(account);
                    }}
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
                        Sign in as {testAccounts.find(acc => acc.email === selectedAccount)?.name}
                      </span>
                    )}
                  </Button>
                )}
              </div>

              {/* Quick Access Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLogin(testAccounts[0])}
                  disabled={isLoading}
                  className="text-xs"
                >
                  <Shield className="h-3 w-3 mr-1 text-purple-600" />
                  Admin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLogin(testAccounts[2])}
                  disabled={isLoading}
                  className="text-xs"
                >
                  <Users className="h-3 w-3 mr-1 text-gray-600" />
                  Demo
                </Button>
              </div>
            </div>
          )}

          {/* Manual Login Form */}
          {!showQuickAccess && (
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">Manual Login</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickAccess(true)}
                  className="text-xs"
                >
                  ← Quick Access
                </Button>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
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
            </form>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Footer */}
          <div className="pt-4 text-center text-xs text-gray-500 border-t">
            <p>2025 Fantasy Football Season</p>
            <p className="mt-1">Powered by Astral Field</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}