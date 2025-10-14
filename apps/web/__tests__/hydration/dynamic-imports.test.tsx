/**
 * Zenith Dynamic Import and Hydration Test Suite
 * Tests for React hydration issues and webpack module loading
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import '@testing-library/jest-dom'

// Mock Next.js dynamic imports
jest.mock('next/dynamic', () => {
  return function mockDynamic(importFn: any, options: any = {}) {
    const Component = React.lazy(importFn)
    return React.forwardRef((props: any, ref: any) => (
      <React.Suspense fallback={options.loading ? options.loading() : <div>Loading...</div>}>
        <Component {...props} ref={ref} />
      </React.Suspense>
    ))
  }
})

// Mock components to prevent actual imports during testing
jest.mock('@/components/navigation/optimized-navigation', () => ({
  OptimizedNavigation: ({ user }: { user: any }) => (
    <nav data-testid="mock-navigation">Navigation for {user?.name}</nav>
  )
}))

jest.mock('@/components/performance/catalyst-performance-monitor', () => ({
  CatalystPerformanceMonitor: () => (
    <div data-testid="mock-performance-monitor">Performance Monitor</div>
  )
}))

jest.mock('@/components/debug/auth-debug', () => ({
  AuthDebugPanel: () => (
    <div data-testid="mock-auth-debug">Auth Debug Panel</div>
  )
}))

// Test dynamic import utilities
describe('Hydration-Safe Dynamic Imports', () => {
  let mockConsoleError: jest.SpyInstance

  beforeEach(() => {
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    mockConsoleError.mockRestore()
  })

  describe('hydrationSafeDynamic', () => {
    it('should create a dynamic component with SSR disabled', async () => {
      const { hydrationSafeDynamic } = await import('@/lib/hydration-safe-dynamic')
      
      const TestComponent = () => <div data-testid="test-component">Test</div>
      const DynamicComponent = hydrationSafeDynamic(
        () => Promise.resolve({ default: TestComponent }),
        { ssr: false }
      )

      render(<DynamicComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('test-component')).toBeInTheDocument()
      })
    })

    it('should handle import failures gracefully', async () => {
      const { hydrationSafeDynamic } = await import('@/lib/hydration-safe-dynamic')
      
      const DynamicComponent = hydrationSafeDynamic(
        () => Promise.reject(new Error('Import failed')),
        { 
          ssr: false,
          fallback: <div data-testid="fallback">Fallback Component</div>
        }
      )

      render(<DynamicComponent />)
      
      // Should show loading first, then fallback on error
      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          'Dynamic import failed:',
          expect.any(Error)
        )
      })
    })

    it('should show loading component during import', async () => {
      const { hydrationSafeDynamic } = await import('@/lib/hydration-safe-dynamic')
      
      let resolveImport: (value: any) => void
      const importPromise = new Promise(resolve => {
        resolveImport = resolve
      })

      const TestComponent = () => <div data-testid="test-component">Test</div>
      const DynamicComponent = hydrationSafeDynamic(
        () => importPromise,
        { 
          ssr: false,
          loading: () => <div data-testid="custom-loading">Custom Loading</div>
        }
      )

      render(<DynamicComponent />)
      
      // Should show loading component
      expect(screen.getByTestId('custom-loading')).toBeInTheDocument()
      
      // Resolve the import
      resolveImport!({ default: TestComponent })
      
      await waitFor(() => {
        expect(screen.getByTestId('test-component')).toBeInTheDocument()
      })
    })
  })

  describe('authSafeDynamic', () => {
    it('should create auth component with proper loading state', async () => {
      const { authSafeDynamic } = await import('@/lib/hydration-safe-dynamic')
      
      const AuthComponent = () => <div data-testid="auth-component">Auth Component</div>
      const DynamicAuthComponent = authSafeDynamic(
        () => Promise.resolve({ default: AuthComponent })
      )

      render(<DynamicAuthComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-component')).toBeInTheDocument()
      })
    })

    it('should have SSR disabled for auth components', async () => {
      const { authSafeDynamic } = await import('@/lib/hydration-safe-dynamic')
      
      const AuthComponent = () => <div>Auth Component</div>
      const DynamicAuthComponent = authSafeDynamic(
        () => Promise.resolve({ default: AuthComponent })
      )

      // This should not throw hydration errors
      expect(() => render(<DynamicAuthComponent />)).not.toThrow()
    })
  })

  describe('navigationSafeDynamic', () => {
    it('should create navigation component with proper loading state', async () => {
      const { navigationSafeDynamic } = await import('@/lib/hydration-safe-dynamic')
      
      const NavComponent = () => <nav data-testid="nav-component">Navigation</nav>
      const DynamicNavComponent = navigationSafeDynamic(
        () => Promise.resolve({ default: NavComponent })
      )

      render(<DynamicNavComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('nav-component')).toBeInTheDocument()
      })
    })
  })

  describe('dashboardSafeDynamic', () => {
    it('should create dashboard component with complex loading state', async () => {
      const { dashboardSafeDynamic } = await import('@/lib/hydration-safe-dynamic')
      
      let resolveImport: (value: any) => void
      const importPromise = new Promise(resolve => {
        resolveImport = resolve
      })

      const DashboardComponent = () => <div data-testid="dashboard-component">Dashboard</div>
      const DynamicDashboardComponent = dashboardSafeDynamic(
        () => importPromise
      )

      render(<DynamicDashboardComponent />)
      
      // Should show complex loading state
      await waitFor(() => {
        const loadingElements = screen.getAllByText('Loading...')
        expect(loadingElements.length).toBeGreaterThan(0)
      })
      
      // Resolve the import
      resolveImport!({ default: DashboardComponent })
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-component')).toBeInTheDocument()
      })
    })
  })

  describe('monitoringSafeDynamic', () => {
    it('should create monitoring component with no loading state', async () => {
      const { monitoringSafeDynamic } = await import('@/lib/hydration-safe-dynamic')
      
      const MonitoringComponent = () => <div data-testid="monitoring-component">Monitoring</div>
      const DynamicMonitoringComponent = monitoringSafeDynamic(
        () => Promise.resolve({ default: MonitoringComponent })
      )

      render(<DynamicMonitoringComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('monitoring-component')).toBeInTheDocument()
      })
    })
  })
})

// Test Dashboard Layout Hydration
describe('Dashboard Layout Hydration', () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com'
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }

  beforeEach(() => {
    // Mock useSession hook
    jest.doMock('next-auth/react', () => ({
      useSession: () => ({
        data: mockSession,
        status: 'authenticated'
      }),
      SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
    }))
    
    // Mock useRouter
    jest.doMock('next/navigation', () => ({
      useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn()
      })
    }))
  })

  it('should render dashboard layout without hydration errors', async () => {
    const { DashboardLayout } = await import('@/components/dashboard/layout')
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <SessionProvider session={mockSession}>
        <DashboardLayout>
          <div data-testid="test-content">Test Content</div>
        </DashboardLayout>
      </SessionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    // Should not have any hydration errors
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('hydration'),
      expect.anything()
    )
    
    consoleSpy.mockRestore()
  })

  it('should handle authentication loading state correctly', async () => {
    jest.doMock('next-auth/react', () => ({
      useSession: () => ({
        data: null,
        status: 'loading'
      }),
      SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
    }))

    const { DashboardLayout } = await import('@/components/dashboard/layout')
    
    render(
      <SessionProvider session={null}>
        <DashboardLayout>
          <div data-testid="test-content">Test Content</div>
        </DashboardLayout>
      </SessionProvider>
    )

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  it('should handle unauthenticated state correctly', async () => {
    const mockPush = jest.fn()
    
    jest.doMock('next-auth/react', () => ({
      useSession: () => ({
        data: null,
        status: 'unauthenticated'
      }),
      SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
    }))

    jest.doMock('next/navigation', () => ({
      useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        back: jest.fn()
      })
    }))

    const { DashboardLayout } = await import('@/components/dashboard/layout')
    
    render(
      <SessionProvider session={null}>
        <DashboardLayout>
          <div data-testid="test-content">Test Content</div>
        </DashboardLayout>
      </SessionProvider>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/signin')
    })
  })

  it('should suppress hydration warnings on dynamic content', async () => {
    const { DashboardLayout } = await import('@/components/dashboard/layout')
    
    const { container } = render(
      <SessionProvider session={mockSession}>
        <DashboardLayout>
          <div data-testid="test-content">Test Content</div>
        </DashboardLayout>
      </SessionProvider>
    )

    // Check that suppressHydrationWarning is applied
    const dashboardContainer = container.querySelector('[suppresshydrationwarning]')
    expect(dashboardContainer).toBeInTheDocument()
  })
})

// Error Boundary Tests
describe('Dashboard Error Boundary', () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com'
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }

  beforeEach(() => {
    jest.doMock('next-auth/react', () => ({
      useSession: () => ({
        data: mockSession,
        status: 'authenticated'
      }),
      SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
    }))
    
    jest.doMock('next/navigation', () => ({
      useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn()
      })
    }))
  })

  it('should catch and display errors from child components', async () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    const { DashboardLayout } = await import('@/components/dashboard/layout')
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <SessionProvider session={mockSession}>
        <DashboardLayout>
          <ThrowError />
        </DashboardLayout>
      </SessionProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Refresh Page')).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  it('should provide refresh functionality when error occurs', async () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    const { DashboardLayout } = await import('@/components/dashboard/layout')
    
    // Mock window.location.reload
    const originalReload = window.location.reload
    const mockReload = jest.fn()
    Object.defineProperty(window.location, 'reload', {
      writable: true,
      value: mockReload,
    })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <SessionProvider session={mockSession}>
        <DashboardLayout>
          <ThrowError />
        </DashboardLayout>
      </SessionProvider>
    )

    await waitFor(() => {
      const refreshButton = screen.getByText('Refresh Page')
      refreshButton.click()
      expect(mockReload).toHaveBeenCalled()
    })

    // Restore original function
    window.location.reload = originalReload
    consoleSpy.mockRestore()
  })
})
