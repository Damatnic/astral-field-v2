'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  User, 
  Settings, 
  LogOut, 
  Home, 
  Trophy, 
  Users, 
  BarChart3, 
  Calendar, 
  MessageCircle,
  Shield,
  Crown,
  UserCircle,
  Zap,
  Activity,
  TrendingUp,
  Search,
  Bell,
  ChevronDown
} from 'lucide-react';

// Navigation item interface
interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Array<'ADMIN' | 'COMMISSIONER' | 'PLAYER'>;
  exact?: boolean;
}

// Main navigation items with enhanced design
const mainNavItems: NavItem[] = [
  {
    name: 'Command Center',
    href: '/dashboard',
    icon: Zap
  },
  {
    name: 'Dynasty League',
    href: '/leagues',
    icon: Crown
  },
  {
    name: 'Player Universe',
    href: '/players',
    icon: Users
  },
  {
    name: 'Squad Management',
    href: '/roster',
    icon: Shield
  },
  {
    name: 'Trade Hub',
    href: '/trades',
    icon: TrendingUp
  },
  {
    name: 'Analytics Lab',
    href: '/analytics',
    icon: Activity
  }
];

// Admin/Commissioner only items (empty for now)
const adminNavItems: NavItem[] = [];

// Mobile navigation component
function MobileNav({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout, hasPermission } = useAuth();
  const pathname = usePathname();

  if (!isOpen) return null;

  const isActiveLink = (href: string, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const allNavItems = [...mainNavItems, ...adminNavItems.filter(item => 
    !item.roles || hasPermission(item.roles)
  )];

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-600 bg-opacity-75"
        onClick={onClose}
      />
      
      {/* Mobile menu */}
      <div className="fixed inset-y-0 left-0 flex w-full max-w-sm flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
          <Link href="/" className="flex items-center space-x-2" onClick={onClose}>
            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AF</span>
            </div>
            <span className="text-xl font-bold text-gray-900">AstralField</span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {allNavItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActiveLink(item.href, item.exact);
            
            return (
              <Link
                key={item.name}
                href={item.href as any}
                onClick={onClose}
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <IconComponent className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        {user && (
          <div className="border-t border-gray-200 px-4 py-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                {user.image ? (
                  <Image
                    className="h-10 w-10 rounded-full"
                    src={user.image}
                    alt={user.name || 'User'}
                    width={40}
                    height={40}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <UserCircle className="h-6 w-6 text-primary-600" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user.role}
                </p>
              </div>
            </div>
            
            <div className="space-y-1">
              <Link
                href={"/settings" as any}
                onClick={onClose}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
              <button
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Enhanced User menu dropdown
function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-user-menu]')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) return null;

  return (
    <div className="relative" data-user-menu>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-quantum-400/50 transition-all duration-300 backdrop-blur-sm"
      >
        {user.image ? (
          <Image
            className="h-8 w-8 rounded-full ring-2 ring-quantum-400/30"
            src={user.image}
            alt={user.name || 'User'}
            width={32}
            height={32}
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gradient-cosmic flex items-center justify-center">
            <UserCircle className="h-5 w-5 text-white" />
          </div>
        )}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-quantum-400 capitalize">{user.role}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-starlight-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-3 w-72 origin-top-right rounded-2xl bg-void-500/95 backdrop-blur-xl border border-white/10 shadow-cosmic overflow-hidden"
          >
            {/* User info header */}
            <div className="p-4 border-b border-white/10 bg-gradient-cosmic/10">
              <div className="flex items-center space-x-3">
                {user.image ? (
                  <Image
                    className="h-12 w-12 rounded-full ring-2 ring-quantum-400/50"
                    src={user.image}
                    alt={user.name || 'User'}
                    width={48}
                    height={48}
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-cosmic flex items-center justify-center">
                    <UserCircle className="h-7 w-7 text-white" />
                  </div>
                )}
                <div>
                  <p className="text-base font-semibold text-white">{user.name}</p>
                  <p className="text-sm text-starlight-400">{user.email}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-quantum-500/20 text-quantum-300 capitalize mt-1">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Menu items */}
            <div className="py-2">
              <Link
                href={"/profile" as any}
                className="flex items-center px-4 py-3 text-sm text-starlight-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                onClick={() => setIsOpen(false)}
              >
                <User className="mr-3 h-5 w-5 text-quantum-400" />
                <div>
                  <p className="font-medium">Dynasty Profile</p>
                  <p className="text-xs text-starlight-500">Manage your profile</p>
                </div>
              </Link>
              
              <Link
                href={"/settings" as any}
                className="flex items-center px-4 py-3 text-sm text-starlight-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="mr-3 h-5 w-5 text-quantum-400" />
                <div>
                  <p className="font-medium">Command Settings</p>
                  <p className="text-xs text-starlight-500">Preferences & notifications</p>
                </div>
              </Link>
              
              <div className="border-t border-white/10 mt-2 pt-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center px-4 py-3 text-sm text-starlight-300 hover:text-supernova-400 hover:bg-supernova-500/10 transition-all duration-200"
                >
                  <LogOut className="mr-3 h-5 w-5 text-supernova-400" />
                  <div className="text-left">
                    <p className="font-medium">Sign Out</p>
                    <p className="text-xs text-starlight-500">End dynasty session</p>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Main Navigation Component
export default function Navigation() {
  const { user, isLoading, hasPermission } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const pathname = usePathname();

  // Don't show navigation on login page
  if (pathname === '/login') {
    return null;
  }

  const isActiveLink = (href: string, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const visibleNavItems = mainNavItems.concat(
    adminNavItems.filter(item => !item.roles || hasPermission(item.roles))
  );

  return (
    <>
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="nav-astral sticky top-0 z-50"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-20 justify-between items-center">
            {/* Logo and brand */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center space-x-6"
            >
              <Link href="/" className="flex items-center space-x-4 group">
                <motion.div 
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  <div className="h-12 w-12 bg-gradient-cosmic rounded-2xl flex items-center justify-center shadow-glow-quantum animate-cosmic-glow group-hover:shadow-glow-cosmic transition-all duration-300">
                    <span className="text-white font-bold text-xl text-heading">AF</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-cosmic rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                </motion.div>
                <div className="hidden sm:block">
                  <h1 className="text-2xl font-bold text-heading bg-gradient-cosmic bg-clip-text text-transparent">
                    AstralField
                  </h1>
                  <p className="text-xs text-quantum-400 font-mono tracking-wider">DYNASTY LEAGUE</p>
                </div>
              </Link>

              {/* Desktop Navigation */}
              {user && (
                <motion.nav 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="hidden xl:flex space-x-2"
                >
                  {visibleNavItems.map((item, index) => {
                    const IconComponent = item.icon;
                    const active = isActiveLink(item.href, item.exact);
                    
                    return (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                      >
                        <Link
                          href={item.href as any}
                          className={`nav-link-astral group ${active ? 'active' : ''}`}
                        >
                          <IconComponent className="h-5 w-5 transition-transform group-hover:scale-110" />
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.nav>
              )}
            </motion.div>

            {/* Right side - Actions and user menu */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center space-x-4"
            >
              {isLoading ? (
                <div className="loading-astral"></div>
              ) : user ? (
                <>
                  {/* Search */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSearchOpen(!searchOpen)}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-quantum-400/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    <Search className="h-5 w-5 text-starlight-400 hover:text-quantum-400 transition-colors" />
                  </motion.button>

                  {/* Notifications */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-quantum-400/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    <Bell className="h-5 w-5 text-starlight-400 hover:text-quantum-400 transition-colors" />
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-nebula-500 rounded-full animate-pulse"></span>
                  </motion.button>

                  {/* Desktop user menu */}
                  <div className="hidden lg:block">
                    <UserMenu />
                  </div>
                  
                  {/* Mobile menu button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMobileMenuOpen(true)}
                    className="xl:hidden p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-quantum-400/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    <Menu className="h-6 w-6 text-starlight-400 hover:text-quantum-400 transition-colors" />
                  </motion.button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="btn-astral-primary"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Launch Dynasty
                </Link>
              )}
            </motion.div>
          </div>
        </div>

        {/* Search overlay */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/10 bg-void-500/95 backdrop-blur-xl"
            >
              <div className="mx-auto max-w-7xl px-6 py-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search players, teams, analytics..."
                    className="input-astral pl-12"
                    autoFocus
                  />
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-starlight-400" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Mobile Navigation */}
      <MobileNav 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
    </>
  );
}