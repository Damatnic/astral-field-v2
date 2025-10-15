import { render, screen, fireEvent } from '@testing-library/react'
import { BottomSheet } from '@/components/mobile/bottom-sheet'
import '@testing-library/jest-dom'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValue: () => 0,
  useTransform: () => 1
}))

describe('BottomSheet', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock document.body.style
    Object.defineProperty(document.body, 'style', {
      value: {
        overflow: ''
      },
      writable: true
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders when open', () => {
    render(
      <BottomSheet isOpen={true} onClose={mockOnClose}>
        <div>Test content</div>
      </BottomSheet>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <BottomSheet isOpen={false} onClose={mockOnClose}>
        <div>Test content</div>
      </BottomSheet>
    )

    expect(screen.queryByText('Test content')).not.toBeInTheDocument()
  })

  it('renders with title', () => {
    render(
      <BottomSheet isOpen={true} onClose={mockOnClose} title="Test Title">
        <div>Test content</div>
      </BottomSheet>
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('renders close button when title is provided', () => {
    render(
      <BottomSheet isOpen={true} onClose={mockOnClose} title="Test Title">
        <div>Test content</div>
      </BottomSheet>
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    expect(closeButton).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <BottomSheet isOpen={true} onClose={mockOnClose} title="Test Title">
        <div>Test content</div>
      </BottomSheet>
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onClose when backdrop is clicked', () => {
    render(
      <BottomSheet isOpen={true} onClose={mockOnClose}>
        <div>Test content</div>
      </BottomSheet>
    )

    // Find the backdrop (first div with onClick)
    const backdrop = screen.getByText('Test content').closest('div')?.parentElement?.firstElementChild
    if (backdrop) {
      fireEvent.click(backdrop)
    }

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('renders drag handle when showHandle is true', () => {
    render(
      <BottomSheet isOpen={true} onClose={mockOnClose} showHandle={true}>
        <div>Test content</div>
      </BottomSheet>
    )

    const handle = screen.getByLabelText('Drag handle - swipe down to close')
    expect(handle).toBeInTheDocument()
  })

  it('does not render drag handle when showHandle is false', () => {
    render(
      <BottomSheet isOpen={true} onClose={mockOnClose} showHandle={false}>
        <div>Test content</div>
      </BottomSheet>
    )

    expect(screen.queryByLabelText('Drag handle - swipe down to close')).not.toBeInTheDocument()
  })

  it('applies correct ARIA attributes', () => {
    render(
      <BottomSheet isOpen={true} onClose={mockOnClose} title="Test Title">
        <div>Test content</div>
      </BottomSheet>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Test Title')
  })

  it('applies default aria-label when no title provided', () => {
    render(
      <BottomSheet isOpen={true} onClose={mockOnClose}>
        <div>Test content</div>
      </BottomSheet>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-label', 'Bottom Sheet Modal')
  })

  it('applies correct CSS classes for bottom sheet structure', () => {
    render(
      <BottomSheet isOpen={true} onClose={mockOnClose}>
        <div>Test content</div>
      </BottomSheet>
    )

    const bottomSheet = screen.getByRole('dialog')
    expect(bottomSheet).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0', 'z-50')
  })

  it('applies correct CSS classes for background gradient', () => {
    render(
      <BottomSheet isOpen={true} onClose={mockOnClose}>
        <div>Test content</div>
      </BottomSheet>
    )

    const bottomSheet = screen.getByRole('dialog')
    expect(bottomSheet).toHaveClass('bg-gradient-to-b', 'from-slate-900', 'to-slate-950')
  })

  it('applies correct CSS classes for border and shadow', () => {
    render(
      <BottomSheet isOpen={true} onClose={mockOnClose}>
        <div>Test content</div>
      </BottomSheet>
    )

    const bottomSheet = screen.getByRole('dialog')
    expect(bottomSheet).toHaveClass('border-t', 'border-slate-700', 'rounded-t-3xl', 'shadow-2xl')
  })

  it('applies correct CSS classes for content area', () => {
    render(
      <BottomSheet isOpen={true} onClose={mockOnClose}>
        <div>Test content</div>
      </BottomSheet>
    )

    const contentArea = screen.getByText('Test content').closest('.overflow-y-auto')
    expect(contentArea).toHaveClass('max-h-[calc(95vh-8rem)]', 'overscroll-contain')
  })

  it('prevents body scroll when open', () => {
    const { rerender } = render(
      <BottomSheet isOpen={false} onClose={mockOnClose}>
        <div>Test content</div>
      </BottomSheet>
    )

    // Open the bottom sheet
    rerender(
      <BottomSheet isOpen={true} onClose={mockOnClose}>
        <div>Test content</div>
      </BottomSheet>
    )

    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body scroll when closed', () => {
    const { rerender } = render(
      <BottomSheet isOpen={true} onClose={mockOnClose}>
        <div>Test content</div>
      </BottomSheet>
    )

    // Close the bottom sheet
    rerender(
      <BottomSheet isOpen={false} onClose={mockOnClose}>
        <div>Test content</div>
      </BottomSheet>
    )

    expect(document.body.style.overflow).toBe('')
  })

  it('handles drag end event', () => {
    render(
      <BottomSheet isOpen={true} onClose={mockOnClose}>
        <div>Test content</div>
      </BottomSheet>
    )

    const bottomSheet = screen.getByRole('dialog')
    
    // Simulate drag end with high velocity
    fireEvent.mouseDown(bottomSheet)
    fireEvent.mouseMove(bottomSheet, { clientY: 200 })
    fireEvent.mouseUp(bottomSheet)

    // The onClose should be called due to drag
    expect(mockOnClose).toHaveBeenCalled()
  })
})
