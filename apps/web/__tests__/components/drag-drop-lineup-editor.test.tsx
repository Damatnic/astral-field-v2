import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DragDropLineupEditor } from '@/components/lineup/drag-drop-lineup-editor'
import '@testing-library/jest-dom'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock @dnd-kit
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  closestCenter: jest.fn(),
  DragOverlay: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  sortableKeyboardCoordinates: jest.fn(),
  verticalListSortingStrategy: jest.fn(),
  arrayMove: (arr: any[], from: number, to: number) => {
    const newArr = [...arr]
    const item = newArr[from]
    newArr.splice(from, 1)
    newArr.splice(to, 0, item)
    return newArr
  },
}))

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => 'translate3d(0, 0, 0)',
    },
  },
}))

describe('DragDropLineupEditor', () => {
  const mockRoster = [
    {
      id: '1',
      name: 'Josh Allen',
      position: 'QB',
      team: 'BUF',
      fantasyPoints: 24.5,
      projectedPoints: 22.0,
      isStarter: true
    },
    {
      id: '2',
      name: 'Christian McCaffrey',
      position: 'RB',
      team: 'SF',
      fantasyPoints: 18.2,
      projectedPoints: 20.0,
      isStarter: true
    },
    {
      id: '3',
      name: 'Backup RB',
      position: 'RB',
      team: 'DAL',
      fantasyPoints: 8.5,
      projectedPoints: 10.0,
      isStarter: false
    }
  ]

  const mockOnSave = jest.fn(() => Promise.resolve())

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders starting lineup and bench sections', () => {
    render(
      <DragDropLineupEditor
        roster={mockRoster}
        onSave={mockOnSave}
        rosterSettings={{
          positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
          benchSize: 6
        }}
      />
    )

    expect(screen.getByText('Starting Lineup')).toBeInTheDocument()
    expect(screen.getByText('Bench')).toBeInTheDocument()
  })

  it('displays projected total for starters', () => {
    render(
      <DragDropLineupEditor
        roster={mockRoster}
        onSave={mockOnSave}
      />
    )

    // Projected total should be sum of starters: 22.0 + 20.0 = 42.0
    expect(screen.getByText(/42.0/)).toBeInTheDocument()
  })

  it('shows starter players in starting lineup', () => {
    render(
      <DragDropLineupEditor
        roster={mockRoster}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('Josh Allen')).toBeInTheDocument()
    expect(screen.getByText('Christian McCaffrey')).toBeInTheDocument()
  })

  it('shows bench players in bench section', () => {
    render(
      <DragDropLineupEditor
        roster={mockRoster}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('Backup RB')).toBeInTheDocument()
  })

  it('auto-optimize button is present', () => {
    render(
      <DragDropLineupEditor
        roster={mockRoster}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('Auto-Optimize')).toBeInTheDocument()
  })

  it('save button is disabled when no changes', () => {
    render(
      <DragDropLineupEditor
        roster={mockRoster}
        onSave={mockOnSave}
      />
    )

    const saveButton = screen.getByText('Save Lineup')
    expect(saveButton).toBeDisabled()
  })

  it('undo button is disabled initially', () => {
    render(
      <DragDropLineupEditor
        roster={mockRoster}
        onSave={mockOnSave}
      />
    )

    const undoButton = screen.getAllByRole('button').find(btn => 
      btn.getAttribute('title') === 'Undo'
    )
    expect(undoButton).toBeDisabled()
  })

  it('displays unsaved changes indicator when hasChanges is true', async () => {
    render(
      <DragDropLineupEditor
        roster={mockRoster}
        onSave={mockOnSave}
      />
    )

    // Click auto-optimize to trigger changes
    const optimizeButton = screen.getByText('Auto-Optimize')
    fireEvent.click(optimizeButton)

    await waitFor(() => {
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
    })
  })
})

