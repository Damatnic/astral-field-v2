'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAccessibility, AccessibleButton, FocusManager } from '@/utils/accessibility';
import {
  Home,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronRight,
  Trophy,
  Target,
  Calendar,
  Bell
} from 'lucide-react';

// Navigation Item Interface
interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  shortcut?: string;
  badge?: string;
  description?: string;
  children?: NavigationItem[];
}

// Accessible Navigation Component
export function AccessibleNavigation() {
  const { settings, announceToScreenReader } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('dashboard');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  
  const navigationRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Navigation structure
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      shortcut: 'D',
      description: 'Main dashboard with team overview and quick actions'
    },
    {
      id: 'my-team',
      label: 'My Team',
      href: '/my-team',
      icon: Users,
      shortcut: 'T',
      description: 'Manage your fantasy team roster and lineup',
      children: [
        {
          id: 'roster',
          label: 'Roster Management',
          href: '/my-team/roster',
          icon: Trophy,
          description: 'Set your starting lineup and manage players'
        },
        {
          id: 'waivers',
          label: 'Waiver Wire',
          href: '/my-team/waivers',
          icon: Target,
          description: 'Add and drop players from the waiver wire'
        }
      ]
    },
    {
      id: 'players',
      label: 'Players',
      href: '/players',
      icon: BarChart3,
      shortcut: 'P',
      description: 'Browse and analyze player statistics and rankings'
    },
    {
      id: 'matchups',
      label: 'Matchups',
      href: '/matchups',
      icon: Calendar,
      shortcut: 'M',
      description: 'View weekly matchups and schedule'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      href: '/notifications',
      icon: Bell,
      badge: '3',
      description: 'View alerts and updates about your team'
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      shortcut: 'S',
      description: 'Customize your fantasy football experience'
    }
  ];

  // Flatten navigation for keyboard navigation
  const flattenedItems = React.useMemo(() => {
    const flatten = (items: NavigationItem[], depth = 0): (NavigationItem & { depth: number })[] => {
      return items.reduce((acc, item) => {
        acc.push({ ...item, depth });
        if (item.children && expandedItems.includes(item.id)) {
          acc.push(...flatten(item.children, depth + 1));
        }
        return acc;
      }, [] as (NavigationItem & { depth: number })[]);
    };
    return flatten(navigationItems);
  }, [expandedItems]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % flattenedItems.length);
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev === 0 ? flattenedItems.length - 1 : prev - 1);
        break;
      
      case 'ArrowRight':
        e.preventDefault();
        const currentItem = flattenedItems[focusedIndex];
        if (currentItem?.children && !expandedItems.includes(currentItem.id)) {
          toggleExpanded(currentItem.id);
        }
        break;
      
      case 'ArrowLeft':
        e.preventDefault();
        const focusedItem = flattenedItems[focusedIndex];
        if (focusedItem?.children && expandedItems.includes(focusedItem.id)) {
          toggleExpanded(focusedItem.id);
        }
        break;
      
      case 'Enter':
      case ' ':
        e.preventDefault();
        const selectedItem = flattenedItems[focusedIndex];
        if (selectedItem) {
          handleNavigation(selectedItem);
        }
        break;
      
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      
      case 'End':
        e.preventDefault();
        setFocusedIndex(flattenedItems.length - 1);
        break;
      
      case 'Escape':
        if (isOpen) {
          closeNavigation();
        }
        break;
    }
  };

  // Handle item selection
  const handleNavigation = (item: NavigationItem) => {
    if (item.children) {
      toggleExpanded(item.id);
    } else {
      setActiveItem(item.id);
      announceToScreenReader(`Navigating to ${item.label}`);
      closeNavigation();
      // Navigation logic would go here
    }
  };

  // Toggle expanded state
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
    
    const item = navigationItems.find(nav => nav.id === itemId);
    const isExpanding = !expandedItems.includes(itemId);
    announceToScreenReader(`${item?.label} submenu ${isExpanding ? 'expanded' : 'collapsed'}`);
  };

  // Open/close navigation
  const openNavigation = () => {
    setIsOpen(true);
    setFocusedIndex(0);
    announceToScreenReader('Navigation menu opened. Use arrow keys to navigate, Enter to select.');
  };

  const closeNavigation = () => {
    setIsOpen(false);
    menuButtonRef.current?.focus();
    announceToScreenReader('Navigation menu closed');
  };

  // Focus management
  useEffect(() => {
    if (isOpen && navigationRef.current) {
      const focusableElements = FocusManager.getFocusableElements(navigationRef.current);
      if (focusableElements[focusedIndex]) {
        focusableElements[focusedIndex].focus();
      }
    }
  }, [isOpen, focusedIndex]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey) return;
      
      // Handle shortcuts when navigation is closed
      if (!isOpen) {
        navigationItems.forEach(item => {
          if (item.shortcut && e.key.toLowerCase() === item.shortcut.toLowerCase()) {
            e.preventDefault();
            setActiveItem(item.id);
            announceToScreenReader(`Quick navigation to ${item.label}`);
          }
        });
      }
    };

    if (settings.keyboardNavigation) {
      document.addEventListener('keydown', handleGlobalKeyDown);
      return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }
  }, [isOpen, settings.keyboardNavigation]);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <AccessibleButton
          ref={menuButtonRef}
          variant="primary"
          onClick={openNavigation}
          aria-expanded={isOpen}
          aria-controls="main-navigation"
          aria-label="Open main navigation menu"
          className="p-3 rounded-lg shadow-lg"
        >
          <Menu className="w-6 h-6" />
        </AccessibleButton>
      </div>

      {/* Navigation Panel */}
      <motion.nav
        ref={navigationRef}
        id="main-navigation"
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        className={`fixed left-0 top-0 bottom-0 w-80 bg-white shadow-xl border-r border-gray-200 z-40 lg:relative lg:translate-x-0 lg:shadow-none ${
          settings.highContrast ? 'border-gray-900 shadow-2xl' : ''
        }`}
        role="navigation"
        aria-label="Main navigation"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <h2 className={`font-bold text-gray-900 ${settings.largeText ? 'text-xl' : 'text-lg'}`}>
              Astral Field
            </h2>
            <AccessibleButton
              variant="ghost"
              onClick={closeNavigation}
              aria-label="Close navigation menu"
              className="lg:hidden p-2"
            >
              <X className="w-5 h-5" />
            </AccessibleButton>
          </div>
          
          {settings.keyboardNavigation && (
            <p className="text-xs text-gray-600 mt-2">
              Press letter keys for quick navigation
            </p>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto">
          <ul 
            role="tree" 
            aria-label="Main navigation items"
            className="p-4 space-y-1"
          >
            {navigationItems.map((item, index) => (
              <NavigationItem
                key={item.id}
                item={item}
                isActive={activeItem === item.id}
                isFocused={flattenedItems[focusedIndex]?.id === item.id}
                isExpanded={expandedItems.includes(item.id)}
                onToggle={() => toggleExpanded(item.id)}
                onSelect={() => handleNavigation(item)}
                depth={0}
              />
            ))}
          </ul>
        </div>

        {/* Keyboard Shortcuts Help */}
        {settings.keyboardNavigation && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              {navigationItems
                .filter(item => item.shortcut)
                .slice(0, 4)
                .map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.shortcut}</span>
                    <span>{item.label}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </motion.nav>

      {/* Overlay for mobile */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-25 z-30 lg:hidden"
          onClick={closeNavigation}
          aria-hidden="true"
        />
      )}
    </>
  );
}

// Individual Navigation Item Component
function NavigationItem({
  item,
  isActive,
  isFocused,
  isExpanded,
  onToggle,
  onSelect,
  depth
}: {
  item: NavigationItem;
  isActive: boolean;
  isFocused: boolean;
  isExpanded?: boolean;
  onToggle: () => void;
  onSelect: () => void;
  depth: number;
}) {
  const { settings } = useAccessibility();
  const hasChildren = item.children && item.children.length > 0;

  return (
    <>
      <li role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
        <button
          onClick={hasChildren ? onToggle : onSelect}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isActive 
              ? 'bg-blue-600 text-white' 
              : isFocused 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-700 hover:bg-gray-100'
          } ${
            settings.highContrast ? 'ring-2 ring-current' : ''
          } ${
            settings.largeText ? 'py-3 text-lg' : 'py-2 text-base'
          }`}
          style={{ marginLeft: `${depth * 1}rem` }}
          aria-describedby={`${item.id}-description`}
          tabIndex={isFocused ? 0 : -1}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          
          <span className="flex-1 min-w-0">
            {item.label}
            {item.shortcut && settings.keyboardNavigation && (
              <span className="ml-2 text-xs opacity-75">
                ({item.shortcut})
              </span>
            )}
          </span>
          
          {item.badge && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {item.badge}
            </span>
          )}
          
          {hasChildren && (
            <ChevronRight 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              aria-hidden="true"
            />
          )}
          
          <div id={`${item.id}-description`} className="sr-only">
            {item.description}
          </div>
        </button>
      </li>
      
      {/* Child Items */}
      {hasChildren && isExpanded && (
        <li role="group">
          <ul className="ml-4 mt-1 space-y-1" role="group">
            {item.children?.map(child => (
              <NavigationItem
                key={child.id}
                item={child}
                isActive={false}
                isFocused={false}
                onToggle={() => {}}
                onSelect={() => onSelect()}
                depth={depth + 1}
              />
            ))}
          </ul>
        </li>
      )}
    </>
  );
}