'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Calendar, 
  MessageCircle,
  Shield,
  Crown,
  UserCircle
} from 'lucide-react';

// Navigation item interface
interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Array<'ADMIN' | 'COMMISSIONER' | 'PLAYER'>;
  exact?: boolean;
}

// Main navigation items
const mainNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
    exact: true
  },
  {
    name: 'Leagues',
    href: '/leagues',
    icon: Trophy
  },
  {
    name: 'Players',
    href: '/players',
    icon: Users
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3
  },
  {
    name: 'Schedule',
    href: '/schedule',
    icon: Calendar
  },
  {
    name: 'Chat',
    href: '/chat',
    icon: MessageCircle
  }
];

// Admin/Commissioner only items
const adminNavItems: NavItem[] = [
  {
    name: 'Admin Panel',
    href: '/admin',
    icon: Shield,
    roles: ['ADMIN']
  },
  {
    name: 'Commissioner',
    href: '/commissioner',
    icon: Crown,
    roles: ['ADMIN', 'COMMISSIONER']
  }
];

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
                {user.avatar ? (
                  <img
                    className="h-10 w-10 rounded-full"
                    src={user.avatar}
                    alt={user.name}
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
        className="flex items-center space-x-3 rounded-full bg-white p-1 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        {user.avatar ? (
          <img
            className="h-8 w-8 rounded-full"
            src={user.avatar}
            alt={user.name}
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
            <UserCircle className="h-5 w-5 text-primary-600" />
          </div>
        )}
        <span className="hidden md:block font-medium text-gray-700">
          {user.name}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none slide-down">
          <div className="py-1">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
              <p className="text-xs text-primary-600 capitalize mt-1">{user.role}</p>
            </div>
            
            <Link
              href={"/profile" as any}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setIsOpen(false)}
            >
              <User className="mr-3 h-4 w-4" />
              Profile
            </Link>
            
            <Link
              href={"/settings" as any}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="mr-3 h-4 w-4" />
              Settings
            </Link>
            
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Navigation Component
export default function Navigation() {
  const { user, isLoading, hasPermission } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo and brand */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AF</span>
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                AstralField
              </span>
            </Link>

            {/* Desktop Navigation */}
            {user && (
              <nav className="hidden lg:flex space-x-1">
                {visibleNavItems.map((item) => {
                  const IconComponent = item.icon;
                  const active = isActiveLink(item.href, item.exact);
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href as any}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
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

          {/* Right side - User menu and mobile menu button */}
          <div className="flex items-center space-x-4">
            {isLoading ? (
              <div className="h-8 w-8 loading-spinner"></div>
            ) : user ? (
              <>
                {/* Desktop user menu */}
                <div className="hidden lg:block">
                  <UserMenu />
                </div>
                
                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden rounded-md p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100"
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

      {/* Mobile Navigation */}
      <MobileNav 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
    </header>
  );
}