/**
 * PageHeader Component Tests
 * Comprehensive test coverage for page header component
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PageHeader } from '@/components/ui/page-header'
import { Trophy } from 'lucide-react'

describe('PageHeader Component', () => {
  it('should render title', () => {
    render(<PageHeader title="Test Page" />)
    expect(screen.getByText('Test Page')).toBeInTheDocument()
  })

  it('should render description when provided', () => {
    render(
      <PageHeader 
        title="Test Page" 
        description="This is a test description" 
      />
    )
    expect(screen.getByText('This is a test description')).toBeInTheDocument()
  })

  it('should render icon when provided', () => {
    const { container } = render(
      <PageHeader title="Test Page" icon={Trophy} />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should render breadcrumbs', () => {
    render(
      <PageHeader 
        title="Test Page"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Current' },
        ]}
      />
    )
    
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Current')).toBeInTheDocument()
  })

  it('should render breadcrumb links correctly', () => {
    render(
      <PageHeader 
        title="Test Page"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Current' },
        ]}
      />
    )
    
    const homeLink = screen.getByText('Home')
    expect(homeLink.tagName).toBe('A')
    expect(homeLink).toHaveAttribute('href', '/')
    
    const currentSpan = screen.getByText('Current')
    expect(currentSpan.tagName).toBe('SPAN')
  })

  it('should render actions when provided', () => {
    render(
      <PageHeader 
        title="Test Page"
        actions={<button>Action Button</button>}
      />
    )
    expect(screen.getByText('Action Button')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <PageHeader title="Test" className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<PageHeader title="Test" ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  describe('Complex Scenarios', () => {
    it('should render complete page header with all features', () => {
      render(
        <PageHeader
          title="Dashboard"
          description="Your fantasy football command center"
          icon={Trophy}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Dashboard' },
          ]}
          actions={
            <div>
              <button>Action 1</button>
              <button>Action 2</button>
            </div>
          }
          className="test-header"
        />
      )

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Your fantasy football command center')).toBeInTheDocument()
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Action 1')).toBeInTheDocument()
      expect(screen.getByText('Action 2')).toBeInTheDocument()
    })
  })
})

