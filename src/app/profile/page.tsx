'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Trophy, Target, TrendingUp, Calendar, Award, Star, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';

export default function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      // Fetch user stats
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(console.error);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-astral-dark p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* Profile Header */}
        <div className="astral-card-premium p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-astral-quantum-500 to-astral-cosmic-600 flex items-center justify-center"
              >
                <User className="w-12 h-12 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold text-white font-orbitron mb-2">
                  {user?.name || 'Guest User'}
                </h1>
                <p className="text-astral-light-shadow mb-4">{user?.email}</p>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 bg-astral-quantum-500/20 text-astral-quantum-400 rounded-full text-sm font-medium">
                    {user?.role || 'PLAYER'}
                  </span>
                  <span className="text-sm text-astral-light-shadow">
                    Member since {new Date().getFullYear()}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="cosmic">Edit Profile</Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Trophy, label: 'Championships', value: '2', color: 'quantum' },
            { icon: Target, label: 'Win Rate', value: '67%', color: 'cosmic' },
            { icon: TrendingUp, label: 'Best Season', value: '2023', color: 'nebula' },
            { icon: Award, label: 'Weekly High', value: '178.5', color: 'supernova' }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="astral-card p-6"
            >
              <div className={`w-12 h-12 rounded-lg bg-astral-${stat.color}-500/20 flex items-center justify-center mb-4`}>
                <stat.icon className={`w-6 h-6 text-astral-${stat.color}-400`} />
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-astral-light-shadow">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="astral-card-premium p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-6 h-6 text-astral-quantum-400" />
            <h2 className="text-xl font-bold text-white">Recent Activity</h2>
          </div>
          <div className="space-y-4">
            {[
              { action: 'Won matchup', details: 'vs Team Alpha', time: '2 hours ago', icon: Trophy },
              { action: 'Traded player', details: 'Acquired J. Jefferson', time: '1 day ago', icon: Target },
              { action: 'Set lineup', details: 'Week 4 lineup optimized', time: '2 days ago', icon: Calendar },
              { action: 'Waiver claim', details: 'Added K. Walker III', time: '3 days ago', icon: Star }
            ].map((activity, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-4 p-4 bg-astral-dark-surface/30 rounded-lg"
              >
                <div className="w-10 h-10 rounded-full bg-astral-quantum-500/10 flex items-center justify-center">
                  <activity.icon className="w-5 h-5 text-astral-quantum-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{activity.action}</p>
                  <p className="text-sm text-astral-light-shadow">{activity.details}</p>
                </div>
                <span className="text-xs text-astral-light-shadow">{activity.time}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}