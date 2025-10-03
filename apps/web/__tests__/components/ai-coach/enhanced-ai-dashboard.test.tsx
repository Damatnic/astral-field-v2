/**
 * Enhanced AI Dashboard Component Tests
 * 
 * Tests for enhanced AI dashboard with advanced features
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EnhancedAIDashboard } from '@/components/ai-coach/enhanced-ai-dashboard'
import { toast } from 'sonner'

jest.mock('sonner')
global.fetch = jest.fn()

describe('EnhancedAIDashboard Component', () => {
  const mockProps = {
    userId: 'user-123',
    leagueId: 'league-123',
    teamId: 'team-123',
    currentWeek: 4
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { predictions: [], recommendations: [] } })
    })
  })

  describe('Rendering', () => {
    it('should render without crashing', async () => {
      render(<EnhancedAIDashboard {...mockProps} />)
      await waitFor(() => {
        expect(screen.getByText('Nova AI Coach')).toBeInTheDocument()
      })
    })

    it('should show loading state initially', () => {
      render(<EnhancedAIDashboard {...mockProps} />)
      expect(screen.getByText('Loading Nova AI Intelligence...')).toBeInTheDocument()
    })

    it('should display confidence score', async () => {
      render(<EnhancedAIDashboard {...mockProps} />)
      await waitFor(() => {
        expect(screen.getByText('Confidence Score')).toBeInTheDocument()
      })
    })
  })

  describe('AI Insights', () => {
    it('should display AI insights', async () => {
      render(<EnhancedAIDashboard {...mockProps} />)
      await waitFor(() => {
        expect(screen.getByText(/Lineup Optimization Available/)).toBeInTheDocument()
      })
    })

    it('should show insight priorities', async () => {
      render(<EnhancedAIDashboard {...mockProps} />)
      await waitFor(() => {
        const insights = screen.getAllByText(/Confidence/)
        expect(insights.length).toBeGreaterThan(0)
      })
    })
  })

  describe('NLP Query Interface', () => {
    it('should display NLP query input', async () => {
      render(<EnhancedAIDashboard {...mockProps} />)
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Ask about your lineup/)).toBeInTheDocument()
      })
    })

    it('should handle NLP query submission', async () => {
      render(<EnhancedAIDashboard {...mockProps} />)
      
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Ask about your lineup/)
        fireEvent.change(input, { target: { value: 'lineup' } })
        
        const button = screen.getByText('Ask AI')
        fireEvent.click(button)
      })
    })

    it('should display NLP response', async () => {
      render(<EnhancedAIDashboard {...mockProps} />)
      
      await waitFor(async () => {
        const input = screen.getByPlaceholderText(/Ask about your lineup/)
        fireEvent.change(input, { target: { value: 'lineup' } })
        
        const button = screen.getByText('Ask AI')
        fireEvent.click(button)
        
        await waitFor(() => {
          expect(screen.getByText(/Nova AI/)).toBeInTheDocument()
        })
      })
    })
  })

  describe('Tab Navigation', () => {
    it('should display all tabs', async () => {
      render(<EnhancedAIDashboard {...mockProps} />)
      await waitFor(() => {
        expect(screen.getByText('AI Overview')).toBeInTheDocument()
        expect(screen.getByText('Predictions')).toBeInTheDocument()
        expect(screen.getByText('Lineup AI')).toBeInTheDocument()
      })
    })

    it('should switch tabs', async () => {
      render(<EnhancedAIDashboard {...mockProps} />)
      
      await waitFor(() => {
        const predictionsTab = screen.getByText('Predictions')
        fireEvent.click(predictionsTab)
        expect(predictionsTab.closest('button')).toHaveClass('border-purple-500')
      })
    })
  })

  describe('Quick Actions', () => {
    it('should display quick action buttons', async () => {
      render(<EnhancedAIDashboard {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Optimize Lineup')).toBeInTheDocument()
        expect(screen.getByText('Analyze Waivers')).toBeInTheDocument()
      })
    })

    it('should execute AI actions', async () => {
      render(<EnhancedAIDashboard {...mockProps} />)
      
      await waitFor(() => {
        const button = screen.getByText('Optimize Lineup')
        fireEvent.click(button)
        expect(toast.success).toHaveBeenCalled()
      })
    })
  })
})
