'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  Settings, 
  LogOut, 
  Home, 
  Trophy, 
  Users, 
  BarChart3, 
  Calendar, 
  MessageCircle,
  UserCircle,
  Search,
  Bell,
  Plus,
  ArrowRight,
  TrendingUp,
  Activity,
  Star
} from 'lucide-react';

// Navigation item interface
interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Array<'ADMIN' | 'COMMISSIONER' | 'PLAYER'>;
  exact?: boolean;
  badge?: number;
  description?: string;
}

// Main navigation items with enhanced mobile descriptions
const mainNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
    exact: true,
    description: 'Your fantasy home base'
  },
  {
    name: 'My Leagues',
    href: '/leagues',
    icon: Trophy,
    description: 'Manage all your leagues'
  },
  {
    name: 'Players',
    href: '/players',
    icon: Users,
    description: 'Player stats & analysis'
  },
  {
    name: 'Live Scores',
    href: '/live',
    icon: Activity,
    description: 'Real-time game updates',
    badge: 3
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Advanced insights & trends'
  },
  {
    name: 'Schedule',
    href: '/schedule',
    icon: Calendar,
    description: 'Games & important dates'
  },
  {
    name: 'Chat',
    href: '/chat',
    icon: MessageCircle,
    description: 'League discussions',
    badge: 2
  }
];

// Quick action items for mobile
const quickActionItems = [
  {
    name: 'Add Player',
    href: '/players/add',
    icon: Plus,
    color: 'bg-green-500'
  },
  {
    name: 'Trade Center',
    href: '/trades',
    icon: ArrowRight,
    color: 'bg-blue-500'
  },
  {
    name: 'Trending',
    href: '/trending',
    icon: TrendingUp,
    color: 'bg-purple-500'
  },
  {
    name: 'Favorites',
    href: '/favorites',
    icon: Star,
    color: 'bg-yellow-500'
  }
];

// Enhanced Mobile Navigation Component
function EnhancedMobileNav({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isActiveLink = (href: string, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const allNavItems = [...mainNavItems];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Mobile menu */}
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 flex w-full max-w-sm flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 shadow-2xl"
          >
            {/* Header */}
            <div className="flex h-16 items-center justify-between px-6 border-b border-gray-700/50">
              <Link href="/" className="flex items-center space-x-3" onClick={onClose}>
                <div className="h-10 w-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-black text-lg">AF</span>
                </div>
                <div>
                  <span className="text-xl font-bold text-white">AstralField</span>
                  <p className="text-xs text-gray-300">Fantasy Football</p>
                </div>
              </Link>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all"
              >
                <X className="h-6 w-6" />
              </motion.button>
            </div>

            {/* User Profile Section */}
            {user && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="px-6 py-4 border-b border-gray-700/50"
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {user.avatar ? (
                      <Image
                        className="h-12 w-12 rounded-full ring-2 ring-blue-400"
                        src={user.avatar}
                        alt={user.name}
                        width={48}
                        height={48}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center ring-2 ring-blue-400">
                        <UserCircle className="h-7 w-7 text-white" />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-400 rounded-full border-2 border-gray-900"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-sm text-gray-300 capitalize">
                      {user.role} • Active
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">League Rank</div>
                    <div className="text-lg font-bold text-green-400">#3</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick Actions */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="px-6 py-4 border-b border-gray-700/50"
            >
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {quickActionItems.map((action, index) => (
                  <motion.div
                    key={action.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    <Link
                      href={action.href as any}
                      onClick={onClose}
                      className="flex flex-col items-center space-y-2 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-all group"
                    >
                      <div className={`p-2 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                        <action.icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-xs text-gray-300 text-center leading-tight">
                        {action.name}
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Main Navigation */}
            <nav className="flex-1 px-6 py-4 overflow-y-auto">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Navigation
              </h3>
              <div className="space-y-2">
                {allNavItems.map((item, index) => {
                  const IconComponent = item.icon;
                  const active = isActiveLink(item.href, item.exact);
                  
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                    >
                      <Link
                        href={item.href as any}
                        onClick={onClose}
                        className={`flex items-center justify-between p-4 rounded-xl transition-all group ${
                          active
                            ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 shadow-lg'
                            : 'hover:bg-gray-700/30 active:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-lg transition-all ${
                            active 
                              ? 'bg-blue-500 text-white shadow-lg' 
                              : 'bg-gray-700 text-gray-300 group-hover:bg-gray-600'
                          }`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div>
                            <div className={`font-medium ${
                              active ? 'text-white' : 'text-gray-200 group-hover:text-white'
                            }`}>
                              {item.name}
                            </div>
                            {item.description && (
                              <div className="text-xs text-gray-400">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {item.badge && (
                            <div className="h-6 w-6 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-white">{item.badge}</span>
                            </div>
                          )}
                          <ArrowRight className={`h-4 w-4 transition-all ${
                            active ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'
                          }`} />
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </nav>

            {/* Footer Actions */}
            {user && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="border-t border-gray-700/50 p-6 space-y-3"
              >
                <Link
                  href="/settings"
                  onClick={onClose}
                  className="flex items-center space-x-4 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-all group"
                >
                  <div className="p-2 rounded-lg bg-gray-700 group-hover:bg-gray-600 transition-colors">
                    <Settings className="h-5 w-5 text-gray-300" />
                  </div>
                  <span className="font-medium text-gray-200 group-hover:text-white">Settings</span>
                </Link>
                
                <button
                  onClick={() => {
                    onClose();
                    logout();
                  }}
                  className="w-full flex items-center space-x-4 p-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition-all group"
                >
                  <div className="p-2 rounded-lg bg-red-500/20 group-hover:bg-red-500/30 transition-colors">
                    <LogOut className="h-5 w-5 text-red-400" />
                  </div>
                  <span className="font-medium text-red-400 group-hover:text-red-300">Sign Out</span>
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Enhanced Mobile Header
function MobileHeader() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Don't show on login page
  if (pathname === '/login') return null;

  return (
    <>
      <header className="lg:hidden bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left side - Menu button and Logo */}
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all"
              >
                <Menu className="h-6 w-6 text-gray-700" />
              </motion.button>
              
              <Link href="/" className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-sm">AF</span>
                </div>
                <span className="text-lg font-bold text-gray-900">AstralField</span>
              </Link>
            </div>

            {/* Right side - Search, Notifications, Profile */}
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all"
              >
                <Search className="h-5 w-5 text-gray-600" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all relative"
              >
                <Bell className="h-5 w-5 text-gray-600" />
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">3</span>
                </div>
              </motion.button>
              
              {user && (
                <Link href="/profile" className="flex-shrink-0">
                  {user.avatar ? (
                    <Image
                      className="h-8 w-8 rounded-full ring-2 ring-blue-400"
                      src={user.avatar}
                      alt={user.name}
                      width={32}
                      height={32}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center ring-2 ring-blue-400">
                      <UserCircle className="h-5 w-5 text-white" />
                    </div>
                  )}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Mobile Navigation */}
      <EnhancedMobileNav 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
    </>
  );
}

export default MobileHeader;