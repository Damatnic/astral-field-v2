'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
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
  TrendingUp,
  Shield,
  UserCircle,
  ChevronDown,
  Activity
} from 'lucide-react';

// Navigation item interface
interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Array<'ADMIN' | 'COMMISSIONER' | 'PLAYER'>;
  exact?: boolean;
}

// Main navigation items - clean and simple
const mainNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home
  },
  {
    name: 'My Team',
    href: '/roster',
    icon: Shield
  },
  {
    name: 'Players',
    href: '/players',
    icon: Users
  },
  {
    name: 'Trades',
    href: '/trades',
    icon: TrendingUp
  },
  {
    name: 'Standings',
    href: '/standings',
    icon: Trophy
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: Activity
  }
];

// Mobile navigation component
function MobileNav({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!isOpen) return null;

  const isActiveLink = (href: string) => pathname.startsWith(href);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25"
        onClick={onClose}
      />
      
      {/* Mobile menu */}
      <div className="fixed inset-y-0 right-0 flex w-full max-w-xs flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
          <span className="text-lg font-semibold text-gray-900">Menu</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {mainNavItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActiveLink(item.href);
            
            return (
              <Link
                key={item.name}
                href={item.href as any}
                onClick={onClose}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-green-50 text-green-700'
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
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <UserCircle className="h-6 w-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
              <Link
                href="/settings"
                onClick={onClose}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
              <button
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// User menu dropdown
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
          <UserCircle className="h-5 w-5 text-gray-600" />
        </div>
        <span className="hidden md:block text-sm font-medium text-gray-700">{user.name}</span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg border border-gray-200 py-1">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          
          <Link
            href="/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setIsOpen(false)}
          >
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </div>
          </Link>
          
          <Link
            href="/settings"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setIsOpen(false)}
          >
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </div>
          </Link>
          
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <div className="flex items-center space-x-2">
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Navigation Component
export default function Navigation() {
  const { user, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Don't show navigation on login page
  if (pathname === '/login') {
    return null;
  }

  const isActiveLink = (href: string) => pathname.startsWith(href);

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            {/* Logo and brand */}
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">Fantasy League</span>
              </Link>

              {/* Desktop Navigation */}
              {user && (
                <nav className="hidden lg:flex space-x-1">
                  {mainNavItems.map((item) => {
                    const IconComponent = item.icon;
                    const active = isActiveLink(item.href);
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.href as any}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? 'bg-green-50 text-green-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>

            {/* Right side - User menu */}
            <div className="flex items-center space-x-4">
              {isLoading ? (
                <div className="loading-spinner"></div>
              ) : user ? (
                <>
                  {/* Desktop user menu */}
                  <div className="hidden lg:block">
                    <UserMenu />
                  </div>
                  
                  {/* Mobile menu button */}
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <Menu className="h-6 w-6" />
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="btn-primary"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <MobileNav 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
    </>
  );
}