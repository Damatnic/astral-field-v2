/**
 * Tabs Component Tests
 * 
 * Comprehensive test suite for UI Tabs component
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

describe('Tabs Components', () => {
  const TabsExample = () => (
    <Tabs defaultValue="tab1">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content 1</TabsContent>
      <TabsContent value="tab2">Content 2</TabsContent>
      <TabsContent value="tab3">Content 3</TabsContent>
    </Tabs>
  )

  describe('Rendering', () => {
    it('should render tabs without crashing', () => {
      render(<TabsExample />)
      expect(screen.getByText('Tab 1')).toBeInTheDocument()
    })

    it('should render all tab triggers', () => {
      render(<TabsExample />)
      expect(screen.getByText('Tab 1')).toBeInTheDocument()
      expect(screen.getByText('Tab 2')).toBeInTheDocument()
      expect(screen.getByText('Tab 3')).toBeInTheDocument()
    })

    it('should show default tab content', () => {
      render(<TabsExample />)
      expect(screen.getByText('Content 1')).toBeInTheDocument()
    })

    it('should not show inactive tab content initially', () => {
      render(<TabsExample />)
      expect(screen.queryByText('Content 2')).not.toBeVisible()
    })
  })

  describe('Tab Switching', () => {
    it('should switch tabs on click', async () => {
      render(<TabsExample />)
      
      await userEvent.click(screen.getByText('Tab 2'))
      
      expect(screen.getByText('Content 2')).toBeVisible()
    })

    it('should hide previous tab content when switching', async () => {
      render(<TabsExample />)
      
      expect(screen.getByText('Content 1')).toBeVisible()
      
      await userEvent.click(screen.getByText('Tab 2'))
      
      expect(screen.queryByText('Content 1')).not.toBeVisible()
    })

    it('should handle multiple tab switches', async () => {
      render(<TabsExample />)
      
      await userEvent.click(screen.getByText('Tab 2'))
      expect(screen.getByText('Content 2')).toBeVisible()
      
      await userEvent.click(screen.getByText('Tab 3'))
      expect(screen.getByText('Content 3')).toBeVisible()
      
      await userEvent.click(screen.getByText('Tab 1'))
      expect(screen.getByText('Content 1')).toBeVisible()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support arrow key navigation', async () => {
      render(<TabsExample />)
      
      const tab1 = screen.getByText('Tab 1')
      tab1.focus()
      
      await userEvent.keyboard('{ArrowRight}')
      expect(screen.getByText('Tab 2')).toHaveFocus()
    })

    it('should support Enter key to activate tab', async () => {
      render(<TabsExample />)
      
      const tab2 = screen.getByText('Tab 2')
      tab2.focus()
      await userEvent.keyboard('{Enter}')
      
      expect(screen.getByText('Content 2')).toBeVisible()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      render(<TabsExample />)
      
      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getAllByRole('tab')).toHaveLength(3)
    })

    it('should have aria-selected on active tab', () => {
      render(<TabsExample />)
      
      const tab1 = screen.getByText('Tab 1')
      expect(tab1).toHaveAttribute('aria-selected', 'true')
    })

    it('should update aria-selected when switching tabs', async () => {
      render(<TabsExample />)
      
      await userEvent.click(screen.getByText('Tab 2'))
      
      expect(screen.getByText('Tab 2')).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('Tab 1')).toHaveAttribute('aria-selected', 'false')
    })
  })

  describe('Custom Classes', () => {
    it('should accept custom className on TabsList', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      )
      
      expect(container.querySelector('.custom-list')).toBeInTheDocument()
    })

    it('should accept custom className on TabsTrigger', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" className="custom-trigger">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      )
      
      expect(screen.getByText('Tab 1')).toHaveClass('custom-trigger')
    })
  })

  describe('Disabled State', () => {
    it('should support disabled tabs', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      )
      
      expect(screen.getByText('Tab 2')).toBeDisabled()
    })

    it('should not switch to disabled tab', async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      )
      
      await userEvent.click(screen.getByText('Tab 2'))
      
      expect(screen.getByText('Content 1')).toBeVisible()
      expect(screen.queryByText('Content 2')).not.toBeVisible()
    })
  })

  describe('Controlled Tabs', () => {
    it('should work as controlled component', async () => {
      const ControlledTabs = () => {
        const [value, setValue] = React.useState('tab1')
        
        return (
          <Tabs value={value} onValueChange={setValue}>
            <TabsList>
              <TabsTrigger value="tab1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">Content 1</TabsContent>
            <TabsContent value="tab2">Content 2</TabsContent>
          </Tabs>
        )
      }
      
      render(<ControlledTabs />)
      
      await userEvent.click(screen.getByText('Tab 2'))
      
      expect(screen.getByText('Content 2')).toBeVisible()
    })
  })

  describe('Performance', () => {
    it('should render quickly', () => {
      const start = Date.now()
      render(<TabsExample />)
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(100)
    })
  })
})
