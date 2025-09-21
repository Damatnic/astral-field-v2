'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Loader2, Crown, Users } from 'lucide-react';

const TEST_USERS = [
  { name: "Nicholas D'Amato", email: "nicholas.damato@test.com", role: "Commissioner", teamName: "D'Amato Dynasty" },
  { name: "Nick Hartley", email: "nick.hartley@test.com", role: "Team Owner", teamName: "Hartley's Heroes" },
  { name: "Jack McCaigue", email: "jack.mccaigue@test.com", role: "Team Owner", teamName: "Jack Attack" },
  { name: "Larry McCaigue", email: "larry.mccaigue@test.com", role: "Team Owner", teamName: "Larry's Legends" },
  { name: "Renee McCaigue", email: "renee.mccaigue@test.com", role: "Team Owner", teamName: "Renee's Reign" },
  { name: "Jon Kornbeck", email: "jon.kornbeck@test.com", role: "Team Owner", teamName: "Kornbeck Crushers" },
  { name: "David Jarvey", email: "david.jarvey@test.com", role: "Team Owner", teamName: "Jarvey's Juggernauts" },
  { name: "Kaity Lorbecki", email: "kaity.lorbecki@test.com", role: "Team Owner", teamName: "Kaity's Knights" },
  { name: "Cason Minor", email: "cason.minor@test.com", role: "Team Owner", teamName: "Minor Threat" },
  { name: "Brittany Bergum", email: "brittany.bergum@test.com", role: "Team Owner", teamName: "Bergum's Best" }
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  
  const handleQuickLogin = async (email: string, name: string) => {
    setLoading(email);
    
    try {
      const response = await fetch('/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Login successful:', data);
        router.push('/dashboard');
      } else {
        const error = await response.json();
        console.error('Login failed:', error);
        alert('Login failed: ' + error.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed: Network error');
    }
    
    setLoading(null);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 max-w-4xl w-full border border-white/20"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-6">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Test League 2025</h1>
          <p className="text-blue-200 text-lg">Week 3 • 10 Team League • ESPN Integration</p>
        </div>
        
        <div className="grid gap-3 max-h-96 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-300" />
            <h2 className="text-xl font-semibold text-white">Quick Login - Choose Your Team:</h2>
          </div>
          
          {TEST_USERS.map((user) => (
            <motion.button
              key={user.email}
              onClick={() => handleQuickLogin(user.email, user.name)}
              disabled={loading !== null}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                w-full p-4 rounded-xl border-2 transition-all backdrop-blur-sm
                ${user.role === 'Commissioner' 
                  ? 'border-yellow-400/50 bg-yellow-900/20 hover:bg-yellow-800/30' 
                  : 'border-blue-400/30 bg-blue-900/20 hover:bg-blue-800/30'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${loading === user.email ? 'animate-pulse' : ''}
              `}
            >
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white text-lg">{user.name}</p>
                    {user.role === 'Commissioner' && (
                      <Crown className="w-5 h-5 text-yellow-400" />
                    )}
                  </div>
                  <p className="text-blue-200 font-medium">{user.teamName}</p>
                  <p className="text-blue-300 text-sm">{user.email}</p>
                </div>
                <div className="text-right">
                  {loading === user.email ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  ) : (
                    <div>
                      {user.role === 'Commissioner' && (
                        <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold block mb-1">
                          COMMISSIONER
                        </span>
                      )}
                      <span className="text-blue-300 text-sm">Click to Login</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
        
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-400/30">
            <h3 className="text-white font-bold mb-2">🔐 Login Info</h3>
            <p className="text-blue-200 text-sm">
              <strong>Password:</strong> fantasy2025 (all users)
            </p>
            <p className="text-blue-300 text-xs mt-1">
              Nicholas D'Amato has commissioner privileges
            </p>
          </div>
          
          <div className="p-4 bg-green-900/20 rounded-lg border border-green-400/30">
            <h3 className="text-white font-bold mb-2">🏈 League Status</h3>
            <p className="text-green-200 text-sm">
              <strong>Current:</strong> Week 3 of 2025 season
            </p>
            <p className="text-green-300 text-xs mt-1">
              Draft completed • Games in progress
            </p>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-blue-300 text-xs">
            Powered by ESPN APIs • No authentication required • Free fantasy platform
          </p>
        </div>
      </motion.div>
    </div>
  );
}