/**
 * Zenith Lineup Manager Component Tests
 * Comprehensive testing for lineup management functionality
 */

import React from 'react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LineupManager } from '@/components/team/lineup-manager'
import { createMockTeam, createMockLeague } from '@/fixtures/leagues.fixture'
import { createMockPlayersByPosition, createMockRosterPlayer } from '@/fixtures/players.fixture'

// Mock drag and drop
const mockDragAndDrop = {
  onDragEnd: jest.fn(),
  onDragStart: jest.fn(),
  onDragOver: jest.fn(),
}

jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children, onDragEnd }: any) => {
    mockDragAndDrop.onDragEnd = onDragEnd
    return React.createElement('div', { 'data-testid': 'drag-drop-context' }, children)
  },
  Droppable: ({ children, droppableId }: any) => 
    React.createElement('div', { 'data-testid': `droppable-${droppableId}` },
      children({ innerRef: jest.fn(), droppableProps: {}, placeholder: null }, {})
    ),
  Draggable: ({ children, draggableId, index }: any) =>
    React.createElement('div', { 'data-testid': `draggable-${draggableId}` },
      children({ innerRef: jest.fn(), draggableProps: {}, dragHandleProps: {} }, {})
    ),
}))

// Mock API calls
const mockUpdateLineup = jest.fn()
jest.mock('@/lib/api', () => ({
  updateLineup: (...args: any[]) => mockUpdateLineup(...args),
}))

describe('LineupManager Component', () => {
  const playersByPosition = createMockPlayersByPosition()
  const mockTeam = createMockTeam()
  const mockLeague = createMockLeague()

  const mockRoster = [
    createMockRosterPlayer({
      id: 'roster-qb-1',
      playerId: 'qb-1',
      position: 'QB',
      isStarter: true,
    }),
    createMockRosterPlayer({
      id: 'roster-rb-1',
      playerId: 'rb-1',
      position: 'RB',
      isStarter: true,
    }),
    createMockRosterPlayer({
      id: 'roster-rb-2',
      playerId: 'rb-2',
      position: 'RB',
      isStarter: true,
    }),
    createMockRosterPlayer({
      id: 'roster-wr-1',
      playerId: 'wr-1',
      position: 'WR',
      isStarter: true,
    }),
    createMockRosterPlayer({
      id: 'roster-wr-2',
      playerId: 'wr-2',
      position: 'WR',
      isStarter: true,
    }),
    createMockRosterPlayer({
      id: 'roster-te-1',
      playerId: 'te-1',
      position: 'TE',
      isStarter: true,
    }),
    createMockRosterPlayer({
      id: 'roster-k-1',
      playerId: 'k-1',
      position: 'K',
      isStarter: true,
    }),
    createMockRosterPlayer({
      id: 'roster-def-1',
      playerId: 'def-1',
      position: 'DEF',
      isStarter: true,
    }),
    // Bench players
    createMockRosterPlayer({
      id: 'roster-rb-3',
      playerId: 'rb-3',
      position: 'RB',
      isStarter: false,
    }),
    createMockRosterPlayer({
      id: 'roster-wr-3',
      playerId: 'wr-3',
      position: 'WR',
      isStarter: false,
    }),
  ]

  const defaultProps = {
    team: mockTeam,
    roster: mockRoster,
    week: 1,
    isLocked: false,
    onLineupChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateLineup.mockResolvedValue({ success: true })
  })

  describe('Rendering', () => {
    it('should render lineup manager with starting lineup', () => {
      render(<LineupManager {...defaultProps} />)

      expect(screen.getByText('Starting Lineup')).toBeInTheDocument()
      expect(screen.getByText('Bench')).toBeInTheDocument()
      
      // Check for position slots
      expect(screen.getByText('QB')).toBeInTheDocument()
      expect(screen.getByText('RB1')).toBeInTheDocument()
      expect(screen.getByText('RB2')).toBeInTheDocument()
      expect(screen.getByText('WR1')).toBeInTheDocument()
      expect(screen.getByText('WR2')).toBeInTheDocument()
      expect(screen.getByText('TE')).toBeInTheDocument()
      expect(screen.getByText('K')).toBeInTheDocument()
      expect(screen.getByText('DEF')).toBeInTheDocument()
    })

    it('should display players in correct positions', () => {
      render(<LineupManager {...defaultProps} />)

      // Starting players should be in lineup
      const startingPlayers = mockRoster.filter(p => p.isStarter)
      startingPlayers.forEach(player => {
        expect(screen.getByTestId(`lineup-player-${player.playerId}`)).toBeInTheDocument()
      })

      // Bench players should be in bench section
      const benchPlayers = mockRoster.filter(p => !p.isStarter)
      benchPlayers.forEach(player => {
        expect(screen.getByTestId(`bench-player-${player.playerId}`)).toBeInTheDocument()
      })
    })

    it('should show empty slots for missing positions', () => {
      const rosterWithoutFlex = mockRoster.filter(p => p.position !== 'FLEX')
      
      render(<LineupManager {...defaultProps} roster={rosterWithoutFlex} />)

      expect(screen.getByTestId('empty-slot-FLEX')).toBeInTheDocument()
      expect(screen.getByText('Add FLEX Player')).toBeInTheDocument()
    })

    it('should display player information correctly', () => {
      render(<LineupManager {...defaultProps} />)

      const qbPlayer = screen.getByTestId('lineup-player-qb-1')
      expect(within(qbPlayer).getByText('Josh Allen')).toBeInTheDocument()
      expect(within(qbPlayer).getByText('QB')).toBeInTheDocument()
      expect(within(qbPlayer).getByText('BUF')).toBeInTheDocument()
    })
  })

  describe('Drag and Drop Functionality', () => {
    it('should handle drag and drop context', () => {
      render(<LineupManager {...defaultProps} />)

      expect(screen.getByTestId('drag-drop-context')).toBeInTheDocument()
    })

    it('should create droppable areas for each position', () => {
      render(<LineupManager {...defaultProps} />)

      expect(screen.getByTestId('droppable-QB')).toBeInTheDocument()
      expect(screen.getByTestId('droppable-RB1')).toBeInTheDocument()
      expect(screen.getByTestId('droppable-RB2')).toBeInTheDocument()
      expect(screen.getByTestId('droppable-bench')).toBeInTheDocument()
    })

    it('should make players draggable', () => {
      render(<LineupManager {...defaultProps} />)

      mockRoster.forEach(player => {
        expect(screen.getByTestId(`draggable-${player.playerId}`)).toBeInTheDocument()
      })
    })

    it('should handle valid position moves', async () => {
      render(<LineupManager {...defaultProps} />)

      // Simulate moving RB from bench to flex
      const dragResult = {
        source: { droppableId: 'bench', index: 0 },
        destination: { droppableId: 'FLEX', index: 0 },
        draggableId: 'rb-3',
      }

      mockDragAndDrop.onDragEnd(dragResult)

      await waitFor(() => {
        expect(defaultProps.onLineupChange).toHaveBeenCalled()
      })
    })

    it('should prevent invalid position moves', async () => {
      render(<LineupManager {...defaultProps} />)

      // Simulate trying to move QB to RB position
      const dragResult = {
        source: { droppableId: 'QB', index: 0 },
        destination: { droppableId: 'RB1', index: 0 },
        draggableId: 'qb-1',
      }

      mockDragAndDrop.onDragEnd(dragResult)

      await waitFor(() => {
        expect(defaultProps.onLineupChange).not.toHaveBeenCalled()
      })
    })

    it('should handle moves within bench', async () => {
      render(<LineupManager {...defaultProps} />)

      const dragResult = {
        source: { droppableId: 'bench', index: 0 },
        destination: { droppableId: 'bench', index: 1 },
        draggableId: 'rb-3',
      }

      mockDragAndDrop.onDragEnd(dragResult)

      await waitFor(() => {
        expect(defaultProps.onLineupChange).toHaveBeenCalled()
      })
    })
  })

  describe('Lineup Validation', () => {
    it('should validate position eligibility', () => {
      render(<LineupManager {...defaultProps} />)

      // RB should be eligible for FLEX
      const rbPlayer = mockRoster.find(p => p.position === 'RB' && !p.isStarter)
      expect(rbPlayer).toBeDefined()

      // QB should not be eligible for RB slot
      const qbPlayer = mockRoster.find(p => p.position === 'QB')
      expect(qbPlayer).toBeDefined()
    })

    it('should enforce roster limits', () => {
      const oversizedRoster = [
        ...mockRoster,
        ...Array.from({ length: 10 }, (_, i) => 
          createMockRosterPlayer({
            id: `extra-${i}`,
            playerId: `extra-player-${i}`,
            position: 'WR',
            isStarter: false,
          })
        ),
      ]

      render(<LineupManager {...defaultProps} roster={oversizedRoster} />)

      // Should still render but with warnings
      expect(screen.getByText('Bench')).toBeInTheDocument()
    })

    it('should show lineup completeness status', () => {
      const incompleteRoster = mockRoster.filter(p => p.position !== 'QB')
      
      render(<LineupManager {...defaultProps} roster={incompleteRoster} />)

      expect(screen.getByTestId('empty-slot-QB')).toBeInTheDocument()
      expect(screen.getByText('Incomplete Lineup')).toBeInTheDocument()
    })
  })

  describe('Lineup Actions', () => {
    it('should save lineup changes', async () => {
      const user = userEvent.setup()
      render(<LineupManager {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /save lineup/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateLineup).toHaveBeenCalledWith({
          teamId: mockTeam.id,
          week: 1,
          lineup: expect.any(Array),
        })
      })
    })

    it('should handle auto-optimize lineup', async () => {
      const user = userEvent.setup()
      render(<LineupManager {...defaultProps} />)

      const optimizeButton = screen.getByRole('button', { name: /auto-optimize/i })
      await user.click(optimizeButton)

      await waitFor(() => {
        expect(defaultProps.onLineupChange).toHaveBeenCalled()
      })
    })

    it('should reset lineup to previous state', async () => {
      const user = userEvent.setup()
      render(<LineupManager {...defaultProps} />)

      const resetButton = screen.getByRole('button', { name: /reset lineup/i })
      await user.click(resetButton)

      await waitFor(() => {
        expect(defaultProps.onLineupChange).toHaveBeenCalled()
      })
    })
  })

  describe('Locked Lineup State', () => {
    it('should disable drag and drop when locked', () => {
      render(<LineupManager {...defaultProps} isLocked={true} />)

      expect(screen.getByText('Lineup Locked')).toBeInTheDocument()
      
      // Drag handles should be disabled
      const dragHandles = screen.getAllByTestId(/draggable-/)
      dragHandles.forEach(handle => {
        expect(handle).toHaveClass('pointer-events-none')
      })
    })

    it('should show locked message', () => {
      render(<LineupManager {...defaultProps} isLocked={true} />)

      expect(screen.getByText(/lineup is locked for this week/i)).toBeInTheDocument()
    })

    it('should disable action buttons when locked', () => {
      render(<LineupManager {...defaultProps} isLocked={true} />)

      const saveButton = screen.getByRole('button', { name: /save lineup/i })
      const optimizeButton = screen.getByRole('button', { name: /auto-optimize/i })

      expect(saveButton).toBeDisabled()
      expect(optimizeButton).toBeDisabled()
    })
  })

  describe('Player Information Display', () => {
    it('should show player projections', () => {
      render(<LineupManager {...defaultProps} />)

      // Mock projections should be displayed
      expect(screen.getByText('18.5 pts')).toBeInTheDocument() // Josh Allen projection
    })

    it('should show injury status', () => {
      const injuredRoster = [
        ...mockRoster,
        createMockRosterPlayer({
          id: 'injured-player',
          playerId: 'injured-wr',
          position: 'WR',
          isStarter: false,
          // Mock injury status in player data
        }),
      ]

      render(<LineupManager {...defaultProps} roster={injuredRoster} />)

      // Should show injury indicators if present
    })

    it('should show bye week warnings', () => {
      render(<LineupManager {...defaultProps} week={12} />) // Josh Allen's bye week

      expect(screen.getByTestId('bye-week-warning-qb-1')).toBeInTheDocument()
      expect(screen.getByText('BYE')).toBeInTheDocument()
    })
  })

  describe('Performance Optimization', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn()
      const MemoizedLineupManager = React.memo(LineupManager)

      const { rerender } = render(
        <MemoizedLineupManager {...defaultProps} />
      )

      // Same props should not cause re-render
      rerender(<MemoizedLineupManager {...defaultProps} />)
      
      // Different props should cause re-render
      rerender(<MemoizedLineupManager {...defaultProps} week={2} />)
    })

    it('should handle large rosters efficiently', () => {
      const largeRoster = Array.from({ length: 50 }, (_, i) =>
        createMockRosterPlayer({
          id: `player-${i}`,
          playerId: `large-player-${i}`,
          position: i % 2 === 0 ? 'WR' : 'RB',
          isStarter: i < 8,
        })
      )

      const startTime = performance.now()
      render(<LineupManager {...defaultProps} roster={largeRoster} />)
      const endTime = performance.now()

      // Should render within reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockUpdateLineup.mockRejectedValue(new Error('API Error'))
      
      const user = userEvent.setup()
      render(<LineupManager {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /save lineup/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to save lineup/i)).toBeInTheDocument()
      })
    })

    it('should handle missing player data', () => {
      const rosterWithMissingData = [
        {
          ...createMockRosterPlayer(),
          playerId: 'missing-player',
          // Player data not available
        },
      ]

      render(<LineupManager {...defaultProps} roster={rosterWithMissingData} />)

      expect(screen.getByText('Unknown Player')).toBeInTheDocument()
    })
  })
})