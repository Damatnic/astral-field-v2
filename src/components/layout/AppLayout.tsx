'use client'

import { ReactNode, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Home, 
  Trophy, 
  Users, 
  Settings, 
  LogOut, 
  Menu,
  X,
  ChevronRight,
  Bell
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

interface AppLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  actions?: ReactNode
  showSidebar?: boolean
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'My Leagues', href: '/dashboard#leagues', icon: Trophy },
  { name: 'Players', href: '/players', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function AppLayout({ 
  children, 
  title, 
  subtitle, 
  actions, 
  showSidebar = true 
}: AppLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Mobile sidebar overlay */}
      {showSidebar && sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      {showSidebar && (
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: sidebarOpen ? 0 : -300 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed inset-y-0 left-0 w-64 bg-gray-800 border-r border-gray-700 z-50 lg:static lg:translate-x-0 lg:z-auto"
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-700">
            <h1 className="text-xl font-bold text-white">Astral Field</h1>
            <button
              onClick={closeSidebar}
              className="lg:hidden p-1 text-gray-400 hover:text-white rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User info */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">{user?.username}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="px-3 py-6">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href.includes('#') && pathname === item.href.split('#')[0])
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => {
                        router.push(item.href)
                        closeSidebar()
                      }}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      {item.name}
                      {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Sidebar footer */}
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </button>
          </div>
        </motion.div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top header */}
        <header className="bg-gray-800 border-b border-gray-700 h-16 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            {showSidebar && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            
            <div>
              {title && <h1 className="text-xl font-bold text-white">{title}</h1>}
              {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
            </button>

            {actions}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

// Specialized layouts
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="absolute inset-0 bg-grid-white/[0.05] opacity-40"></div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}