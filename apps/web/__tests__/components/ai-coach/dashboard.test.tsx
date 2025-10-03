/**
 * AI Coach Dashboard Component Tests
 * 
 * Tests for AI-powered coaching dashboard
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AICoachDashboard } from '@/components/ai-coach/dashboard'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    info: jest.fn(),
    error: jest.fn()
  }
}))

global.fetch = jest.fn()

describe('AICoachDashboard Component', () => {
  const mockRecommendations = [
    {
      type: 'lineup',
      title: 'Optimize Your Lineup',
      description: 'Start Josh Jacobs over current RB2',
      confidence: 78,
      impact: 'high',
      action: 'Start Josh Jacobs'
    },
    {
      type: 'trade',
      title: 'Trade Opportunity',
      description: 'Consider trading for Travis Kelce',
      confidence: 65,
      impact: 'high',
      action: 'Propose trade'
    },
    {
      type: 'waiver',
      title: 'Waiver Wire Gem',
      description: 'Gus Edwards is available',
      confidence: 72,
      impact: 'medium',
      action: 'Claim Gus Edwards'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ recommendations: mockRecommendations })
    })
  })

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<AICoachDashboard userId="user-123" />)
      expect(screen.getByText(/AI Coach/i)).toBeInTheDocument()
    })

    it('should show loading state initially', () => {
      render(<AICoachDashboard userId="user-123" />)
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
    })

    it('should fetch recommendations on mount', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/ai-coach/recommendations')
        )
      })
    })

    it('should display recommendations after loading', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText('Optimize Your Lineup')).toBeInTheDocument()
      })
    })
  })

  describe('Quick Stats', () => {
    it('should display AI confidence stat', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText('AI Confidence')).toBeInTheDocument()
      })
    })

    it('should display lineup score', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText('Lineup Score')).toBeInTheDocument()
      })
    })

    it('should display win probability', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText('Win Probability')).toBeInTheDocument()
      })
    })

    it('should display action items count', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText('Action Items')).toBeInTheDocument()
      })
    })

    it('should calculate average confidence', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        // Average of 78, 65, 72 = 71.67 ≈ 72
        expect(screen.getByText(/72%/)).toBeInTheDocument()
      })
    })
  })

  describe('Tab Navigation', () => {
    it('should display all tabs', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument()
        expect(screen.getByText('Lineup')).toBeInTheDocument()
        expect(screen.getByText('Trades')).toBeInTheDocument()
        expect(screen.getByText('Waivers')).toBeInTheDocument()
      })
    })

    it('should start with overview tab active', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        const overviewTab = screen.getByText('Overview').closest('button')
        expect(overviewTab).toHaveClass('border-blue-500')
      })
    })

    it('should switch tabs on click', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText('Optimize Your Lineup')).toBeInTheDocument()
      })
      
      const lineupTab = screen.getByText('Lineup').closest('button')
      fireEvent.click(lineupTab!)
      
      expect(lineupTab).toHaveClass('border-blue-500')
    })

    it('should filter recommendations by tab', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText('Trade Opportunity')).toBeInTheDocument()
      })
      
      // Switch to Lineup tab
      const lineupTab = screen.getByText('Lineup').closest('button')
      fireEvent.click(lineupTab!)
      
      // Trade recommendation should not be visible
      expect(screen.queryByText('Trade Opportunity')).not.toBeInTheDocument()
      // Lineup recommendation should be visible
      expect(screen.getByText('Optimize Your Lineup')).toBeInTheDocument()
    })
  })

  describe('Recommendations Display', () => {
    it('should display recommendation titles', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText('Optimize Your Lineup')).toBeInTheDocument()
        expect(screen.getByText('Trade Opportunity')).toBeInTheDocument()
        expect(screen.getByText('Waiver Wire Gem')).toBeInTheDocument()
      })
    })

    it('should display recommendation descriptions', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText(/Start Josh Jacobs/)).toBeInTheDocument()
      })
    })

    it('should display confidence scores', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText('78%')).toBeInTheDocument()
        expect(screen.getByText('65%')).toBeInTheDocument()
        expect(screen.getByText('72%')).toBeInTheDocument()
      })
    })

    it('should display impact levels', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getAllByText(/high impact/i).length).toBeGreaterThan(0)
        expect(screen.getByText(/medium impact/i)).toBeInTheDocument()
      })
    })

    it('should display action suggestions', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText(/💡 Start Josh Jacobs/)).toBeInTheDocument()
      })
    })

    it('should show confidence progress bars', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        const progressBars = screen.getAllByRole('progressbar', { hidden: true })
        expect(progressBars.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Recommendation Actions', () => {
    it('should have Details button for each recommendation', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        const detailsButtons = screen.getAllByText('Details')
        expect(detailsButtons.length).toBe(3)
      })
    })

    it('should have Execute button for recommendations with actions', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        const executeButtons = screen.getAllByText('Execute')
        expect(executeButtons.length).toBe(3)
      })
    })

    it('should show toast when clicking Details', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        const detailsButton = screen.getAllByText('Details')[0]
        fireEvent.click(detailsButton)
      })
      
      expect(toast.info).toHaveBeenCalledWith('Detailed analysis coming soon!')
    })

    it('should execute recommendation action', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        const executeButton = screen.getAllByText('Execute')[0]
        fireEvent.click(executeButton)
      })
      
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining('Executing')
      )
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no recommendations', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ recommendations: [] })
      })
      
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText('No recommendations available')).toBeInTheDocument()
      })
    })

    it('should show refresh button in empty state', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ recommendations: [] })
      })
      
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText('Refresh Analysis')).toBeInTheDocument()
      })
    })

    it('should refetch on refresh button click', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ recommendations: [] })
      })
      
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh Analysis')
        fireEvent.click(refreshButton)
      })
      
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should show tab-specific empty message', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ recommendations: [] })
      })
      
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        const tradesTab = screen.getByText('Trades').closest('button')
        fireEvent.click(tradesTab!)
      })
      
      expect(screen.getByText(/No trades recommendations/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      
      render(<AICoachDashboard userId="user-123" />)
      
      // Should still render with mock data
      await waitFor(() => {
        expect(screen.getByText(/Optimize Your/)).toBeInTheDocument()
      })
    })

    it('should use mock data on fetch failure', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        // Mock data should be displayed
        expect(screen.getAllByText(/Confidence/).length).toBeGreaterThan(0)
      })
    })
  })

  describe('AI Coach Info Section', () => {
    it('should display AI coach information', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText('How AI Coach Works')).toBeInTheDocument()
      })
    })

    it('should list AI features', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        expect(screen.getByText(/Real-time player analysis/)).toBeInTheDocument()
        expect(screen.getByText(/Matchup predictions/)).toBeInTheDocument()
        expect(screen.getByText(/Injury risk assessment/)).toBeInTheDocument()
      })
    })
  })

  describe('Impact Colors', () => {
    it('should apply correct color for high impact', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        const highImpact = screen.getAllByText(/high impact/i)[0]
        expect(highImpact).toHaveClass('text-red-400')
      })
    })

    it('should apply correct color for medium impact', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        const mediumImpact = screen.getByText(/medium impact/i)
        expect(mediumImpact).toHaveClass('text-yellow-400')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have accessible tab navigation', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        const tabs = screen.getAllByRole('button')
        expect(tabs.length).toBeGreaterThan(0)
      })
    })

    it('should have accessible buttons', async () => {
      render(<AICoachDashboard userId="user-123" />)
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        buttons.forEach(button => {
          expect(button).toBeInTheDocument()
        })
      })
    })
  })
})
