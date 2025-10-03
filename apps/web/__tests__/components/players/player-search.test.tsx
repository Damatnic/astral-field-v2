/**
 * PlayerSearch Component Tests
 * 
 * Comprehensive test suite for search and filter functionality
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlayerSearch } from '@/components/players/player-search'
import { useRouter, useSearchParams } from 'next/navigation'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn()
}))

describe('PlayerSearch Component', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(() => Promise.resolve())
  }

  const mockSearchParams = {
    get: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
    mockSearchParams.get.mockReturnValue(null)
  })

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<PlayerSearch />)
      
      expect(screen.getByPlaceholderText('Search players...')).toBeInTheDocument()
    })

    it('should render search input', () => {
      render(<PlayerSearch />)
      
      const searchInput = screen.getByPlaceholderText('Search players...')
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveAttribute('type', 'text')
    })

    it('should render position filter', () => {
      render(<PlayerSearch />)
      
      const positionSelect = screen.getByDisplayValue('All Positions')
      expect(positionSelect).toBeInTheDocument()
    })

    it('should render team filter', () => {
      render(<PlayerSearch />)
      
      const teamSelect = screen.getByDisplayValue('All Teams')
      expect(teamSelect).toBeInTheDocument()
    })

    it('should render Search button', () => {
      render(<PlayerSearch />)
      
      expect(screen.getByText('Search')).toBeInTheDocument()
    })

    it('should render Clear button', () => {
      render(<PlayerSearch />)
      
      expect(screen.getByText('Clear')).toBeInTheDocument()
    })

    it('should render search icon', () => {
      render(<PlayerSearch />)
      
      const searchIcon = document.querySelector('svg')
      expect(searchIcon).toBeInTheDocument()
    })
  })

  describe('Initial State from URL', () => {
    it('should initialize with search param from URL', () => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'search') return 'Mahomes'
        return null
      })

      render(<PlayerSearch />)
      
      const searchInput = screen.getByPlaceholderText('Search players...')
      expect(searchInput).toHaveValue('Mahomes')
    })

    it('should initialize with position param from URL', () => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'position') return 'QB'
        return null
      })

      render(<PlayerSearch />)
      
      const positionSelect = screen.getByDisplayValue('QB')
      expect(positionSelect).toBeInTheDocument()
    })

    it('should initialize with team param from URL', () => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'team') return 'KC'
        return null
      })

      render(<PlayerSearch />)
      
      const teamSelect = screen.getByDisplayValue('KC')
      expect(teamSelect).toBeInTheDocument()
    })

    it('should initialize with multiple params from URL', () => {
      mockSearchParams.get.mockImplementation((key) => {
        const params: Record<string, string> = {
          search: 'Mahomes',
          position: 'QB',
          team: 'KC'
        }
        return params[key] || null
      })

      render(<PlayerSearch />)
      
      expect(screen.getByPlaceholderText('Search players...')).toHaveValue('Mahomes')
      expect(screen.getByDisplayValue('QB')).toBeInTheDocument()
      expect(screen.getByDisplayValue('KC')).toBeInTheDocument()
    })
  })

  describe('Search Input', () => {
    it('should update search value on input', async () => {
      render(<PlayerSearch />)
      
      const searchInput = screen.getByPlaceholderText('Search players...')
      await userEvent.type(searchInput, 'Patrick Mahomes')
      
      expect(searchInput).toHaveValue('Patrick Mahomes')
    })

    it('should trigger search on Enter key', async () => {
      render(<PlayerSearch />)
      
      const searchInput = screen.getByPlaceholderText('Search players...')
      await userEvent.type(searchInput, 'Mahomes{Enter}')
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining('search=Mahomes')
        )
      })
    })

    it('should not trigger search on other keys', async () => {
      render(<PlayerSearch />)
      
      const searchInput = screen.getByPlaceholderText('Search players...')
      await userEvent.type(searchInput, 'Mahomes')
      
      // Should not have called router.push yet (only on Enter or Search button)
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('should handle empty search input', async () => {
      render(<PlayerSearch />)
      
      const searchInput = screen.getByPlaceholderText('Search players...')
      await userEvent.clear(searchInput)
      
      expect(searchInput).toHaveValue('')
    })
  })

  describe('Position Filter', () => {
    it('should display all position options', () => {
      render(<PlayerSearch />)
      
      const positionSelect = screen.getByDisplayValue('All Positions')
      const options = Array.from(positionSelect.querySelectorAll('option'))
      
      expect(options).toHaveLength(7) // ALL, QB, RB, WR, TE, K, DEF
    })

    it('should update position on selection', async () => {
      render(<PlayerSearch />)
      
      const positionSelect = screen.getByDisplayValue('All Positions')
      await userEvent.selectOptions(positionSelect, 'QB')
      
      expect(screen.getByDisplayValue('QB')).toBeInTheDocument()
    })

    it('should include ALL positions option', () => {
      render(<PlayerSearch />)
      
      expect(screen.getByText('All Positions')).toBeInTheDocument()
    })

    it('should include specific position options', () => {
      render(<PlayerSearch />)
      
      const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
      positions.forEach(pos => {
        expect(screen.getByText(pos)).toBeInTheDocument()
      })
    })
  })

  describe('Team Filter', () => {
    it('should display all team options', () => {
      render(<PlayerSearch />)
      
      const teamSelect = screen.getByDisplayValue('All Teams')
      const options = Array.from(teamSelect.querySelectorAll('option'))
      
      expect(options.length).toBeGreaterThan(30) // 32 NFL teams + ALL
    })

    it('should update team on selection', async () => {
      render(<PlayerSearch />)
      
      const teamSelect = screen.getByDisplayValue('All Teams')
      await userEvent.selectOptions(teamSelect, 'KC')
      
      expect(screen.getByDisplayValue('KC')).toBeInTheDocument()
    })

    it('should include ALL teams option', () => {
      render(<PlayerSearch />)
      
      expect(screen.getByText('All Teams')).toBeInTheDocument()
    })

    it('should include specific team options', () => {
      render(<PlayerSearch />)
      
      const teams = ['KC', 'SF', 'BUF', 'PHI']
      teams.forEach(team => {
        expect(screen.getByText(team)).toBeInTheDocument()
      })
    })
  })

  describe('Search Button', () => {
    it('should trigger search with all filters', async () => {
      render(<PlayerSearch />)
      
      const searchInput = screen.getByPlaceholderText('Search players...')
      const positionSelect = screen.getByDisplayValue('All Positions')
      const teamSelect = screen.getByDisplayValue('All Teams')
      const searchButton = screen.getByText('Search')
      
      await userEvent.type(searchInput, 'Mahomes')
      await userEvent.selectOptions(positionSelect, 'QB')
      await userEvent.selectOptions(teamSelect, 'KC')
      await userEvent.click(searchButton)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining('search=Mahomes')
        )
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining('position=QB')
        )
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining('team=KC')
        )
      })
    })

    it('should trigger search with only search term', async () => {
      render(<PlayerSearch />)
      
      const searchInput = screen.getByPlaceholderText('Search players...')
      const searchButton = screen.getByText('Search')
      
      await userEvent.type(searchInput, 'Mahomes')
      await userEvent.click(searchButton)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/players?search=Mahomes')
      })
    })

    it('should trigger search with only position', async () => {
      render(<PlayerSearch />)
      
      const positionSelect = screen.getByDisplayValue('All Positions')
      const searchButton = screen.getByText('Search')
      
      await userEvent.selectOptions(positionSelect, 'QB')
      await userEvent.click(searchButton)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/players?position=QB')
      })
    })

    it('should trigger search with only team', async () => {
      render(<PlayerSearch />)
      
      const teamSelect = screen.getByDisplayValue('All Teams')
      const searchButton = screen.getByText('Search')
      
      await userEvent.selectOptions(teamSelect, 'KC')
      await userEvent.click(searchButton)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/players?team=KC')
      })
    })

    it('should not include ALL in URL params', async () => {
      render(<PlayerSearch />)
      
      const searchButton = screen.getByText('Search')
      await userEvent.click(searchButton)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/players?')
      })
    })
  })

  describe('Clear Button', () => {
    it('should clear all filters', async () => {
      mockSearchParams.get.mockImplementation((key) => {
        const params: Record<string, string> = {
          search: 'Mahomes',
          position: 'QB',
          team: 'KC'
        }
        return params[key] || null
      })

      render(<PlayerSearch />)
      
      const clearButton = screen.getByText('Clear')
      await userEvent.click(clearButton)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/players')
      })
    })

    it('should reset search input', async () => {
      render(<PlayerSearch />)
      
      const searchInput = screen.getByPlaceholderText('Search players...')
      await userEvent.type(searchInput, 'Mahomes')
      
      const clearButton = screen.getByText('Clear')
      await userEvent.click(clearButton)
      
      await waitFor(() => {
        expect(searchInput).toHaveValue('')
      })
    })

    it('should reset position to ALL', async () => {
      render(<PlayerSearch />)
      
      const positionSelect = screen.getByDisplayValue('All Positions')
      await userEvent.selectOptions(positionSelect, 'QB')
      
      const clearButton = screen.getByText('Clear')
      await userEvent.click(clearButton)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('All Positions')).toBeInTheDocument()
      })
    })

    it('should reset team to ALL', async () => {
      render(<PlayerSearch />)
      
      const teamSelect = screen.getByDisplayValue('All Teams')
      await userEvent.selectOptions(teamSelect, 'KC')
      
      const clearButton = screen.getByText('Clear')
      await userEvent.click(clearButton)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('All Teams')).toBeInTheDocument()
      })
    })
  })

  describe('Active Filters Display', () => {
    it('should not show active filters when none are set', () => {
      render(<PlayerSearch />)
      
      expect(screen.queryByText('Active filters:')).not.toBeInTheDocument()
    })

    it('should show active filters when search is set', () => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'search') return 'Mahomes'
        return null
      })

      render(<PlayerSearch />)
      
      expect(screen.getByText('Active filters:')).toBeInTheDocument()
      expect(screen.getByText(/Search: "Mahomes"/)).toBeInTheDocument()
    })

    it('should show active filters when position is set', () => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'position') return 'QB'
        return null
      })

      render(<PlayerSearch />)
      
      expect(screen.getByText('Active filters:')).toBeInTheDocument()
      expect(screen.getByText(/Position: QB/)).toBeInTheDocument()
    })

    it('should show active filters when team is set', () => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'team') return 'KC'
        return null
      })

      render(<PlayerSearch />)
      
      expect(screen.getByText('Active filters:')).toBeInTheDocument()
      expect(screen.getByText(/Team: KC/)).toBeInTheDocument()
    })

    it('should show all active filters', () => {
      mockSearchParams.get.mockImplementation((key) => {
        const params: Record<string, string> = {
          search: 'Mahomes',
          position: 'QB',
          team: 'KC'
        }
        return params[key] || null
      })

      render(<PlayerSearch />)
      
      expect(screen.getByText('Active filters:')).toBeInTheDocument()
      expect(screen.getByText(/Search: "Mahomes"/)).toBeInTheDocument()
      expect(screen.getByText(/Position: QB/)).toBeInTheDocument()
      expect(screen.getByText(/Team: KC/)).toBeInTheDocument()
    })

    it('should style filter badges correctly', () => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'search') return 'Mahomes'
        return null
      })

      render(<PlayerSearch />)
      
      const badge = screen.getByText(/Search: "Mahomes"/)
      expect(badge).toHaveClass('text-blue-400')
    })
  })

  describe('User Interactions', () => {
    it('should handle rapid filter changes', async () => {
      render(<PlayerSearch />)
      
      const positionSelect = screen.getByDisplayValue('All Positions')
      
      await userEvent.selectOptions(positionSelect, 'QB')
      await userEvent.selectOptions(positionSelect, 'RB')
      await userEvent.selectOptions(positionSelect, 'WR')
      
      expect(screen.getByDisplayValue('WR')).toBeInTheDocument()
    })

    it('should handle search and immediate clear', async () => {
      render(<PlayerSearch />)
      
      const searchInput = screen.getByPlaceholderText('Search players...')
      const searchButton = screen.getByText('Search')
      const clearButton = screen.getByText('Clear')
      
      await userEvent.type(searchInput, 'Mahomes')
      await userEvent.click(searchButton)
      await userEvent.click(clearButton)
      
      expect(searchInput).toHaveValue('')
    })

    it('should handle multiple searches', async () => {
      render(<PlayerSearch />)
      
      const searchInput = screen.getByPlaceholderText('Search players...')
      const searchButton = screen.getByText('Search')
      
      await userEvent.type(searchInput, 'Mahomes')
      await userEvent.click(searchButton)
      
      await userEvent.clear(searchInput)
      await userEvent.type(searchInput, 'McCaffrey')
      await userEvent.click(searchButton)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Accessibility', () => {
    it('should have accessible form elements', () => {
      render(<PlayerSearch />)
      
      const searchInput = screen.getByPlaceholderText('Search players...')
      const positionSelect = screen.getByDisplayValue('All Positions')
      const teamSelect = screen.getByDisplayValue('All Teams')
      
      expect(searchInput).toBeInTheDocument()
      expect(positionSelect).toBeInTheDocument()
      expect(teamSelect).toBeInTheDocument()
    })

    it('should have accessible buttons', () => {
      render(<PlayerSearch />)
      
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2) // Search and Clear
    })

    it('should support keyboard navigation', async () => {
      render(<PlayerSearch />)
      
      const searchInput = screen.getByPlaceholderText('Search players...')
      
      searchInput.focus()
      expect(searchInput).toHaveFocus()
      
      await userEvent.tab()
      // Should move to next element
    })
  })

  describe('Edge Cases', () => {
    it('should handle special characters in search', async () => {
      render(<PlayerSearch />)
      
      const searchInput = screen.getByPlaceholderText('Search players...')
      const searchButton = screen.getByText('Search')
      
      await userEvent.type(searchInput, "O'Dell")
      await userEvent.click(searchButton)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining("O'Dell")
        )
      })
    })

    it('should handle very long search terms', async () => {
      render(<PlayerSearch />)
      
      const searchInput = screen.getByPlaceholderText('Search players...')
      const longSearch = 'a'.repeat(100)
      
      await userEvent.type(searchInput, longSearch)
      
      expect(searchInput).toHaveValue(longSearch)
    })

    it('should handle empty search submission', async () => {
      render(<PlayerSearch />)
      
      const searchButton = screen.getByText('Search')
      await userEvent.click(searchButton)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/players?')
      })
    })

    it('should handle null search params', () => {
      mockSearchParams.get.mockReturnValue(null)
      
      render(<PlayerSearch />)
      
      expect(screen.getByPlaceholderText('Search players...')).toHaveValue('')
      expect(screen.getByDisplayValue('All Positions')).toBeInTheDocument()
      expect(screen.getByDisplayValue('All Teams')).toBeInTheDocument()
    })
  })
})
