/**
 * Virtual List Component Tests
 * 
 * Tests for high-performance virtualization component
 */

import { render, screen } from '@testing-library/react'
import { VirtualList } from '@/components/ui/virtual-list'

describe('VirtualList Component', () => {
  const mockItems = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i}`
  }))

  const mockRenderItem = ({ item, style }: any) => (
    <div style={style}>{item.name}</div>
  )

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(
        <VirtualList
          items={mockItems}
          height={400}
          itemHeight={50}
          renderItem={mockRenderItem}
        />
      )
      
      expect(screen.getByText('Item 0')).toBeInTheDocument()
    })

    it('should render visible items only', () => {
      render(
        <VirtualList
          items={mockItems}
          height={400}
          itemHeight={50}
          renderItem={mockRenderItem}
        />
      )
      
      // Should render first few items
      expect(screen.getByText('Item 0')).toBeInTheDocument()
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      
      // Should not render items far down the list
      expect(screen.queryByText('Item 99')).not.toBeInTheDocument()
    })

    it('should handle empty items array', () => {
      const { container } = render(
        <VirtualList
          items={[]}
          height={400}
          itemHeight={50}
          renderItem={mockRenderItem}
        />
      )
      
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <VirtualList
          items={mockItems}
          height={400}
          itemHeight={50}
          renderItem={mockRenderItem}
          className="custom-class"
        />
      )
      
      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })

  describe('Item Height', () => {
    it('should accept fixed item height', () => {
      render(
        <VirtualList
          items={mockItems}
          height={400}
          itemHeight={50}
          renderItem={mockRenderItem}
        />
      )
      
      expect(screen.getByText('Item 0')).toBeInTheDocument()
    })

    it('should accept dynamic item height function', () => {
      const dynamicHeight = (index: number) => index % 2 === 0 ? 50 : 100
      
      render(
        <VirtualList
          items={mockItems}
          height={400}
          itemHeight={dynamicHeight}
          renderItem={mockRenderItem}
        />
      )
      
      expect(screen.getByText('Item 0')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should render quickly with large dataset', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`
      }))
      
      const start = Date.now()
      render(
        <VirtualList
          items={largeDataset}
          height={400}
          itemHeight={50}
          renderItem={mockRenderItem}
        />
      )
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(500)
    })

    it('should use memoization', () => {
      const { rerender } = render(
        <VirtualList
          items={mockItems}
          height={400}
          itemHeight={50}
          renderItem={mockRenderItem}
        />
      )
      
      // Rerender with same props should be fast
      const start = Date.now()
      rerender(
        <VirtualList
          items={mockItems}
          height={400}
          itemHeight={50}
          renderItem={mockRenderItem}
        />
      )
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(100)
    })
  })

  describe('Overscan', () => {
    it('should accept overscan prop', () => {
      render(
        <VirtualList
          items={mockItems}
          height={400}
          itemHeight={50}
          renderItem={mockRenderItem}
          overscan={10}
        />
      )
      
      expect(screen.getByText('Item 0')).toBeInTheDocument()
    })

    it('should use default overscan', () => {
      render(
        <VirtualList
          items={mockItems}
          height={400}
          itemHeight={50}
          renderItem={mockRenderItem}
        />
      )
      
      expect(screen.getByText('Item 0')).toBeInTheDocument()
    })
  })

  describe('Custom Key Extraction', () => {
    it('should accept getItemKey prop', () => {
      const getItemKey = (item: any) => `key-${item.id}`
      
      render(
        <VirtualList
          items={mockItems}
          height={400}
          itemHeight={50}
          renderItem={mockRenderItem}
          getItemKey={getItemKey}
        />
      )
      
      expect(screen.getByText('Item 0')).toBeInTheDocument()
    })
  })

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(VirtualList.displayName).toBe('VirtualList')
    })
  })
})
