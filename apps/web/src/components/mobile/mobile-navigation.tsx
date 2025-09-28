'use client'

import React, { useState, useCallback, useEffect, memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMobileCapabilities, useHapticFeedback } from '@/lib/mobile/mobile-utils'
import { motion, AnimatePresence } from 'framer-motion'

// Sigma: Mobile-optimized navigation icons
const HomeIcon = () => <span className="text-xl">🏠</span>
const TeamIcon = () => <span className="text-xl">👥</span>
const PlayersIcon = () => <span className="text-xl">📋</span>
const LiveIcon = () => <span className="text-xl">📺</span>
const CoachIcon = () => <span className="text-xl">✨</span>
const MoreIcon = () => <span className="text-xl">⋯</span>
const CloseIcon = () => <span className="text-xl">✖️</span>

const navigation = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  { name: 'Team', href: '/team', icon: TeamIcon },
  { name: 'Players', href: '/players', icon: PlayersIcon },
  { name: 'Live', href: '/live', icon: LiveIcon },
  { name: 'Coach', href: '/ai-coach', icon: CoachIcon },
] as const

const moreNavigation = [
  { name: 'Analytics', href: '/analytics', icon: () => <span className="text-xl">📊</span> },
  { name: 'Draft', href: '/draft', icon: () => <span className="text-xl">⏰</span> },
  { name: 'Trades', href: '/trades', icon: () => <span className="text-xl">🔄</span> },
  { name: 'Settings', href: '/settings', icon: () => <span className="text-xl">⚙️</span> },
  { name: 'Leagues', href: '/leagues', icon: () => <span className="text-xl">🏆</span> },
] as const

interface MobileBottomNavigationProps {
  className?: string
}

// Sigma: High-performance mobile bottom navigation with haptic feedback
export const MobileBottomNavigation = memo(({ className }: MobileBottomNavigationProps) => {
  const [showMore, setShowMore] = useState(false)
  const pathname = usePathname()
  const capabilities = useMobileCapabilities()
  const { tapFeedback } = useHapticFeedback()

  const handleNavClick = useCallback((href: string) => {
    if (capabilities.supportsVibration) {
      tapFeedback()
    }
    if (href === pathname) {
      // Scroll to top if already on the page
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [capabilities.supportsVibration, tapFeedback, pathname])

  const handleMoreToggle = useCallback(() => {
    setShowMore(prev => !prev)
    if (capabilities.supportsVibration) {
      tapFeedback()
    }
  }, [capabilities.supportsVibration, tapFeedback])

  // Sigma: Auto-hide bottom nav on scroll for immersive experience
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollDelta = currentScrollY - lastScrollY

      // Hide nav when scrolling down, show when scrolling up
      if (scrollDelta > 10 && currentScrollY > 100) {
        setIsVisible(false)
      } else if (scrollDelta < -10 || currentScrollY < 100) {
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    let ticking = false
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', throttledHandleScroll, { passive: true })
    return () => window.removeEventListener('scroll', throttledHandleScroll)
  }, [lastScrollY])

  const isActive = useCallback((href: string) => {
    return pathname === href || pathname?.startsWith(href + '/')
  }, [pathname])

  return (
    <>
      {/* Sigma: More menu overlay */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-modal bg-black/50 backdrop-blur-sm mobile:block hidden"
            onClick={() => setShowMore(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl rounded-t-3xl p-6 safe-area-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">More Options</h3>
                <button
                  onClick={handleMoreToggle}
                  className="p-2 rounded-full bg-slate-800 text-gray-400 hover:text-white transition-colors btn-touch"
                  aria-label="Close menu"
                >
                  <CloseIcon />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {moreNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      handleNavClick(item.href)
                      setShowMore(false)
                    }}
                    className={`flex flex-col items-center p-4 rounded-xl transition-all duration-200 btn-touch ${
                      isActive(item.href)
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-800/50 text-gray-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <item.icon />
                    <span className="text-sm mt-2 font-medium">{item.name}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sigma: Bottom navigation bar */}
      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={`fixed bottom-0 left-0 right-0 z-header bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/50 safe-area-bottom mobile:flex hidden ${className}`}
      >
        <div className="flex items-center justify-around px-4 py-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => handleNavClick(item.href)}
              className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 btn-touch ${
                isActive(item.href)
                  ? 'text-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              aria-label={item.name}
            >
              <motion.div
                animate={{
                  scale: isActive(item.href) ? 1.1 : 1,
                  color: isActive(item.href) ? '#60a5fa' : undefined
                }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                <item.icon />
              </motion.div>
              <span className={`text-xs mt-1 font-medium transition-colors ${
                isActive(item.href) ? 'text-blue-400' : 'text-gray-500'
              }`}>
                {item.name}
              </span>
            </Link>
          ))}
          
          {/* More button */}
          <button
            onClick={handleMoreToggle}
            className="flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 text-gray-400 hover:text-white btn-touch"
            aria-label="More options"
          >
            <motion.div
              animate={{ rotate: showMore ? 90 : 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <MoreIcon />
            </motion.div>
            <span className="text-xs mt-1 font-medium text-gray-500">More</span>
          </button>
        </div>
      </motion.nav>
    </>
  )
})

MobileBottomNavigation.displayName = 'MobileBottomNavigation'

// Sigma: Mobile hamburger menu for tablets and larger mobile devices
interface MobileHamburgerMenuProps {
  isOpen: boolean
  onToggle: () => void
  user?: {
    name?: string | null
    email?: string | null
    teamName?: string | null
  }
}

export const MobileHamburgerMenu = memo(({ isOpen, onToggle, user }: MobileHamburgerMenuProps) => {
  const pathname = usePathname()
  const { tapFeedback } = useHapticFeedback()

  const handleNavClick = useCallback((href: string) => {
    tapFeedback()
    onToggle()
  }, [tapFeedback, onToggle])

  const isActive = useCallback((href: string) => {
    return pathname === href || pathname?.startsWith(href + '/')
  }, [pathname])

  const allNavigation = [...navigation, ...moreNavigation]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-modal bg-black/50 backdrop-blur-sm tablet:block mobile:hidden"
          onClick={onToggle}
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute left-0 top-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-xl safe-area-inset"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  AstralField
                </h2>
                <button
                  onClick={onToggle}
                  className="p-2 rounded-full bg-slate-800 text-gray-400 hover:text-white transition-colors btn-touch"
                  aria-label="Close menu"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* User info */}
              {user && (
                <div className="p-6 border-b border-slate-800/50">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center font-medium text-white">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {user.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {user.teamName || user.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto scroll-smooth-mobile">
                {allNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 btn-touch ${
                      isActive(item.href)
                        ? 'bg-blue-500/20 text-blue-400 border-r-2 border-blue-500'
                        : 'text-gray-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <item.icon />
                    <span className="ml-3 font-medium">{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

MobileHamburgerMenu.displayName = 'MobileHamburgerMenu'

// Sigma: Mobile-optimized tab navigation for content sections
interface MobileTabNavigationProps {
  tabs: { id: string; label: string; icon?: React.ComponentType }[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export const MobileTabNavigation = memo(({ tabs, activeTab, onTabChange, className }: MobileTabNavigationProps) => {
  const { tapFeedback } = useHapticFeedback()

  const handleTabClick = useCallback((tabId: string) => {
    tapFeedback()
    onTabChange(tabId)
  }, [tapFeedback, onTabChange])

  return (
    <div className={`flex bg-slate-800/50 rounded-xl p-1 overflow-x-auto scroll-smooth-mobile ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          className={`flex items-center justify-center px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap btn-touch ${
            activeTab === tab.id
              ? 'bg-blue-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          {tab.icon && <tab.icon />}
          <span className={`${tab.icon ? 'ml-2' : ''} font-medium`}>{tab.label}</span>
        </button>
      ))}
    </div>
  )
})

MobileTabNavigation.displayName = 'MobileTabNavigation'