'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ChevronRight,
  Sparkles,
  Shield,
  Users,
  Crown,
  Zap,
  ArrowLeft,
  Check,
  AlertCircle,
  Gamepad2
} from 'lucide-react';

// Team selection data
const TEAMS = [
  { id: 1, name: "Nicholas D'Amato", email: "nicholas.damato@test.com", team: "D'Amato Dynasty", role: "Commissioner", color: "from-yellow-600 to-orange-600" },
  { id: 2, name: "Nick Hartley", email: "nick.hartley@test.com", team: "Hartley's Heroes", role: "Player", color: "from-cyan-600 to-blue-600" },
  { id: 3, name: "Jack McCaigue", email: "jack.mccaigue@test.com", team: "McCaigue Mayhem", role: "Player", color: "from-red-600 to-pink-600" },
  { id: 4, name: "Larry McCaigue", email: "larry.mccaigue@test.com", team: "Larry Legends", role: "Player", color: "from-green-600 to-emerald-600" },
  { id: 5, name: "Renee McCaigue", email: "renee.mccaigue@test.com", team: "Renee's Reign", role: "Player", color: "from-purple-600 to-violet-600" },
  { id: 6, name: "Jon Kornbeck", email: "jon.kornbeck@test.com", team: "Kornbeck Crushers", role: "Player", color: "from-blue-600 to-indigo-600" },
  { id: 7, name: "David Jarvey", email: "david.jarvey@test.com", team: "Jarvey's Juggernauts", role: "Player", color: "from-orange-600 to-amber-600" },
  { id: 8, name: "Kaity Lorbecki", email: "kaity.lorbecki@test.com", team: "Lorbecki Lions", role: "Player", color: "from-pink-600 to-rose-600" },
  { id: 9, name: "Cason Minor", email: "cason.minor@test.com", team: "Minor Miracles", role: "Player", color: "from-teal-600 to-cyan-600" },
  { id: 10, name: "Brittany Bergum", email: "brittany.bergum@test.com", team: "Bergum Blitz", role: "Player", color: "from-violet-600 to-purple-600" }
];

// Animated background component
const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />
      
      <motion.div
        className="absolute top-0 left-0 w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      >
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full mix-blend-multiply filter blur-3xl opacity-30"
            style={{
              background: `radial-gradient(circle, ${['#7c3aed', '#2563eb', '#dc2626', '#16a34a', '#f59e0b'][i]} 0%, transparent 70%)`,
              width: `${Math.random() * 600 + 300}px`,
              height: `${Math.random() * 600 + 300}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, 100, -100, 0],
              y: [0, -100, 100, 0],
            }}
            transition={{
              duration: Math.random() * 20 + 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>
      
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5" />
    </div>
  );
};

// Team card component for selection
const TeamCard = ({ team, onSelect, isSelected }: any) => (
  <motion.button
    onClick={() => onSelect(team)}
    className={`relative p-4 rounded-xl border transition-all ${
      isSelected 
        ? 'border-white/40 bg-white/10' 
        : 'border-white/10 bg-white/5 hover:bg-white/10'
    }`}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    {team.role === 'Commissioner' && (
      <div className="absolute -top-2 -right-2">
        <div className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
          <Crown className="w-3 h-3" />
          ADMIN
        </div>
      </div>
    )}
    
    <div className="flex items-center gap-3">
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${team.color} flex items-center justify-center text-white font-bold`}>
        {team.name.split(' ').map((n: string) => n[0]).join('')}
      </div>
      <div className="text-left">
        <p className="text-white font-semibold">{team.name}</p>
        <p className="text-gray-400 text-sm">{team.team}</p>
      </div>
    </div>
    
    {isSelected && (
      <motion.div
        layoutId="selected-indicator"
        className="absolute inset-0 border-2 border-purple-500 rounded-xl pointer-events-none"
        initial={false}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}
  </motion.button>
);

export default function ModernLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'team-select'>('team-select');
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    // Check if user selected a team from landing page
    const savedEmail = localStorage.getItem('selected_team_email');
    if (savedEmail) {
      const team = TEAMS.find(t => t.email === savedEmail);
      if (team) {
        setSelectedTeam(team);
        setEmail(team.email);
        setMode('signin');
      }
      localStorage.removeItem('selected_team_email');
    }
  }, []);

  const handleTeamSelect = (team: any) => {
    setSelectedTeam(team);
    setEmail(team.email);
  };

  const handleProceedToSignIn = () => {
    if (selectedTeam) {
      setMode('signin');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
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

      if (response.ok) {
        // Verify session was created by checking /api/auth/me
        const sessionCheck = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (sessionCheck.ok) {
          // Success animation
          await new Promise(resolve => setTimeout(resolve, 1000));
          router.push('/dashboard');
        } else {
          setError('Session creation failed');
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async () => {
    if (!selectedTeam) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({ 
          email: selectedTeam.email,
          password: 'Dynasty2025!' 
        })
      });

      if (response.ok) {
        // Verify session was created by checking /api/auth/me
        const sessionCheck = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (sessionCheck.ok) {
          await new Promise(resolve => setTimeout(resolve, 800));
          router.push('/dashboard');
        } else {
          setError('Session creation failed');
          setMode('signin');
        }
      } else {
        setError('Quick login failed. Please enter password.');
        setMode('signin');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <AnimatedBackground />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-5xl"
      >
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="grid lg:grid-cols-2">
            {/* Left Panel - Branding */}
            <div className="relative p-12 lg:p-16 bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex flex-col justify-between">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-3 mb-12"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">AstralField</h1>
                    <p className="text-purple-200 text-sm">Dynasty League 2025</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                    Welcome to the
                    <span className="block bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                      Championship
                    </span>
                  </h2>
                  <p className="text-purple-200 text-lg">
                    Join 10 elite teams competing for fantasy football supremacy.
                  </p>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-4 mt-8"
              >
                <div className="flex items-center gap-3 text-purple-200">
                  <Shield className="w-5 h-5" />
                  <span>Secure Authentication</span>
                </div>
                <div className="flex items-center gap-3 text-purple-200">
                  <Users className="w-5 h-5" />
                  <span>10 Active Teams</span>
                </div>
                <div className="flex items-center gap-3 text-purple-200">
                  <Gamepad2 className="w-5 h-5" />
                  <span>Real-Time Scoring</span>
                </div>
              </motion.div>
            </div>

            {/* Right Panel - Auth Form */}
            <div className="p-12 lg:p-16">
              <AnimatePresence mode="wait">
                {mode === 'team-select' ? (
                  <motion.div
                    key="team-select"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-3xl font-bold text-white mb-2">Choose Your Team</h3>
                      <p className="text-gray-400">Select your team to continue</p>
                    </div>

                    <div className="grid gap-3 max-h-96 overflow-y-auto pr-2">
                      {TEAMS.map(team => (
                        <TeamCard
                          key={team.id}
                          team={team}
                          onSelect={handleTeamSelect}
                          isSelected={selectedTeam?.id === team.id}
                        />
                      ))}
                    </div>

                    {selectedTeam && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="p-4 bg-purple-600/10 border border-purple-500/20 rounded-xl">
                          <p className="text-sm text-purple-300 mb-1">Selected Team</p>
                          <p className="text-white font-semibold">{selectedTeam.team}</p>
                          <p className="text-gray-400 text-sm">{selectedTeam.name}</p>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={handleQuickLogin}
                            disabled={loading}
                            className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {loading ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <>
                                <Zap className="w-5 h-5" />
                                Quick Login
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleProceedToSignIn}
                            className="flex-1 py-3 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                          >
                            Sign In Manually
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="signin"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <button
                      onClick={() => setMode('team-select')}
                      className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-6"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Change Team
                    </button>

                    <div className="mb-8">
                      <h3 className="text-3xl font-bold text-white mb-2">Sign In</h3>
                      {selectedTeam && (
                        <div className="flex items-center gap-2 mt-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selectedTeam.color} flex items-center justify-center text-white font-bold text-sm`}>
                            {selectedTeam.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{selectedTeam.team}</p>
                            <p className="text-gray-400 text-sm">{selectedTeam.name}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSignIn} className="space-y-5">
                      <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                            placeholder="Enter your email"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-11 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                            placeholder="Enter your password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Default: Dynasty2025!</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-gray-300 text-sm">Remember me</span>
                        </label>
                        <button
                          type="button"
                          className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
                        >
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <span className="text-red-300 text-sm">{error}</span>
                        </motion.div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Signing In...
                          </>
                        ) : (
                          <>
                            Sign In to Dashboard
                            <ChevronRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="mt-6 text-center">
                      <p className="text-gray-400 text-sm">
                        New to AstralField?{' '}
                        <button className="text-purple-400 hover:text-purple-300 transition-colors font-semibold">
                          Contact Commissioner
                        </button>
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <p className="text-gray-400 text-sm">
            © 2025 AstralField Dynasty League • Powered by ESPN API
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}