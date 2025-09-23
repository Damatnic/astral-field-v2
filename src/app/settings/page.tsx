'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Bell, Shield, Eye, Moon, Globe, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-astral-dark p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white font-orbitron mb-2">Settings</h1>
          <p className="text-astral-light-shadow">Customize your AstralField experience</p>
        </div>

        <div className="space-y-6">
          {/* Account Settings */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="astral-card-premium p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-astral-quantum-400" />
              <h2 className="text-xl font-bold text-white">Account Settings</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-astral-light-shadow mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2 bg-astral-dark-surface/50 border border-astral-border rounded-lg text-white"
                  placeholder="your@email.com"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-astral-light-shadow mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-astral-dark-surface/50 border border-astral-border rounded-lg text-white"
                  placeholder="Your Name"
                />
              </div>
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="astral-card-premium p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-6 h-6 text-astral-cosmic-400" />
              <h2 className="text-xl font-bold text-white">Notifications</h2>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Trade Offers', enabled: true },
                { label: 'Waiver Wire Updates', enabled: true },
                { label: 'Injury Alerts', enabled: false },
                { label: 'Score Updates', enabled: true }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-astral-light-shadow">{item.label}</span>
                  <button
                    className={`w-12 h-6 rounded-full transition-colors ${
                      item.enabled 
                        ? 'bg-astral-quantum-500' 
                        : 'bg-astral-dark-surface'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                        item.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Privacy */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="astral-card-premium p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-astral-nebula-400" />
              <h2 className="text-xl font-bold text-white">Privacy & Security</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-astral-light-shadow">Add an extra layer of security</p>
                </div>
                <Button variant="quantum" size="sm">Enable</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Private Profile</p>
                  <p className="text-sm text-astral-light-shadow">Hide your stats from other users</p>
                </div>
                <button className="w-12 h-6 rounded-full bg-astral-dark-surface">
                  <span className="block w-5 h-5 bg-white rounded-full translate-x-1" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}