/**
 * Catalyst Virtual List Component
 * High-performance virtualization for large datasets
 * Optimized for 60fps scrolling with thousands of items
 */

'use client'

import { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef, 
  memo,
  ReactNode,
  UIEvent
} from 'react'
import { cn } from '@/lib/utils'

interface VirtualListProps<T> {
  items: T[]
  height: number
  itemHeight: number | ((index: number, item: T) => number)
  renderItem: (props: { item: T; index: number; style: React.CSSProperties }) => ReactNode
  className?: string
  overscan?: number
  onScroll?: (scrollTop: number) => void
  onEndReached?: () => void
  endReachedThreshold?: number
  estimatedItemHeight?: number
  getItemKey?: (item: T, index: number) => string | number
  horizontal?: boolean
  cacheKeyExtractor?: (item: T) => string
}

interface VirtualListState {
  scrollTop: number
  scrollLeft: number
  isScrolling: boolean
  scrollDirection: 'up' | 'down' | 'left' | 'right' | null
}

const VirtualList = memo(function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll,
  onEndReached,
  endReachedThreshold = 200,
  estimatedItemHeight = 50,
  getItemKey,
  horizontal = false,
  cacheKeyExtractor
}: VirtualListProps<T>) {
  const [state, setState] = useState<VirtualListState>({
    scrollTop: 0,
    scrollLeft: 0,
    isScrolling: false,
    scrollDirection: null
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const isScrollingTimeoutRef = useRef<NodeJS.Timeout>()
  const lastScrollTop = useRef(0)
  const lastScrollLeft = useRef(0)

  // Memoized item height calculation
  const getItemHeightMemo = useCallback((index: number) => {
    return typeof itemHeight === 'function' 
      ? itemHeight(index, items[index])
      : itemHeight
  }, [itemHeight, items])

  // Calculate total size and item positions
  const { totalSize, itemPositions } = useMemo(() => {
    if (!items.length) return { totalSize: 0, itemPositions: [] }

    const positions: number[] = []
    let totalSize = 0

    for (let i = 0; i < items.length; i++) {
      positions[i] = totalSize
      totalSize += getItemHeightMemo(i)
    }

    return { totalSize, itemPositions: positions }
  }, [items, getItemHeightMemo])

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (!items.length) return { startIndex: 0, endIndex: 0, visibleItems: [] }

    const scrollOffset = horizontal ? state.scrollLeft : state.scrollTop
    const containerSize = horizontal ? 
      (containerRef.current?.clientWidth || 0) : 
      (containerRef.current?.clientHeight || height)

    let startIndex = 0
    let endIndex = items.length - 1

    // Binary search for start index
    let low = 0
    let high = items.length - 1
    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const itemPosition = itemPositions[mid]
      
      if (itemPosition < scrollOffset) {
        startIndex = mid
        low = mid + 1
      } else {
        high = mid - 1
      }
    }

    // Find end index
    let accumulatedSize = 0
    for (let i = startIndex; i < items.length; i++) {
      const itemSize = getItemHeightMemo(i)
      if (accumulatedSize > containerSize + endReachedThreshold) {
        endIndex = i
        break
      }
      accumulatedSize += itemSize
    }

    // Apply overscan
    const overscanStartIndex = Math.max(0, startIndex - overscan)
    const overscanEndIndex = Math.min(items.length - 1, endIndex + overscan)

    const visibleItems = []
    for (let i = overscanStartIndex; i <= overscanEndIndex; i++) {
      const item = items[i]
      const position = itemPositions[i]
      const size = getItemHeightMemo(i)

      visibleItems.push({
        index: i,
        item,
        style: horizontal ? {
          position: 'absolute' as const,
          left: position,
          top: 0,
          width: size,
          height: '100%'
        } : {
          position: 'absolute' as const,
          top: position,
          left: 0,
          width: '100%',
          height: size
        }
      })
    }

    return { startIndex: overscanStartIndex, endIndex: overscanEndIndex, visibleItems }
  }, [
    items, 
    state.scrollTop, 
    state.scrollLeft, 
    height, 
    overscan, 
    endReachedThreshold,
    horizontal,
    itemPositions,
    getItemHeightMemo
  ])

  // Handle scroll events
  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget
    const scrollTop = element.scrollTop
    const scrollLeft = element.scrollLeft

    // Determine scroll direction
    let scrollDirection: VirtualListState['scrollDirection'] = null
    if (horizontal) {
      if (scrollLeft > lastScrollLeft.current) scrollDirection = 'right'
      else if (scrollLeft < lastScrollLeft.current) scrollDirection = 'left'
    } else {
      if (scrollTop > lastScrollTop.current) scrollDirection = 'down'
      else if (scrollTop < lastScrollTop.current) scrollDirection = 'up'
    }

    lastScrollTop.current = scrollTop
    lastScrollLeft.current = scrollLeft

    setState(prev => ({
      ...prev,
      scrollTop,
      scrollLeft,
      isScrolling: true,
      scrollDirection
    }))

    // Clear existing timeout
    if (isScrollingTimeoutRef.current) {
      clearTimeout(isScrollingTimeoutRef.current)
    }

    // Set scrolling to false after delay
    isScrollingTimeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        isScrolling: false,
        scrollDirection: null
      }))
    }, 150)

    // Call onScroll callback
    onScroll?.(horizontal ? scrollLeft : scrollTop)

    // Check if end reached
    if (onEndReached) {
      const scrollOffset = horizontal ? scrollLeft : scrollTop
      const containerSize = horizontal ? element.clientWidth : element.clientHeight
      const threshold = totalSize - containerSize - endReachedThreshold

      if (scrollOffset >= threshold) {
        onEndReached()
      }
    }
  }, [horizontal, onScroll, onEndReached, totalSize, endReachedThreshold])

  // Scroll to specific item
  const scrollToItem = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!containerRef.current || !scrollElementRef.current) return

    const itemPosition = itemPositions[index]
    const itemSize = getItemHeightMemo(index)
    const containerSize = horizontal ? 
      containerRef.current.clientWidth : 
      containerRef.current.clientHeight

    let scrollOffset = itemPosition

    if (align === 'center') {
      scrollOffset = itemPosition - (containerSize - itemSize) / 2
    } else if (align === 'end') {
      scrollOffset = itemPosition - containerSize + itemSize
    }

    scrollOffset = Math.max(0, Math.min(scrollOffset, totalSize - containerSize))

    if (horizontal) {
      scrollElementRef.current.scrollLeft = scrollOffset
    } else {
      scrollElementRef.current.scrollTop = scrollOffset
    }
  }, [horizontal, itemPositions, getItemHeightMemo, totalSize])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (isScrollingTimeoutRef.current) {
        clearTimeout(isScrollingTimeoutRef.current)
      }
    }
  }, [])

  // Generate key for items
  const getKey = useCallback((item: T, index: number) => {
    if (getItemKey) return getItemKey(item, index)
    if (cacheKeyExtractor) return cacheKeyExtractor(item)
    return index
  }, [getItemKey, cacheKeyExtractor])

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      style={{
        width: '100%',
        height,
        ...(horizontal && { overflowX: 'auto', overflowY: 'hidden' }),
        ...(!horizontal && { overflowX: 'hidden', overflowY: 'auto' })
      }}
    >
      <div
        ref={scrollElementRef}
        className="relative w-full h-full overflow-auto"
        onScroll={handleScroll}
        style={{
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* Total size container */}
        <div
          style={{
            position: 'relative',
            ...(horizontal ? {
              width: totalSize,
              height: '100%'
            } : {
              width: '100%',
              height: totalSize
            })
          }}
        >
          {/* Visible items */}
          {visibleRange.visibleItems.map(({ index, item, style }) => (
            <div key={getKey(item, index)} style={style}>
              {renderItem({ item, index, style })}
            </div>
          ))}
        </div>
      </div>

      {/* Loading indicator for scrolling */}
      {state.isScrolling && (
        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
          Scrolling...
        </div>
      )}
    </div>
  )
}) as <T>(props: VirtualListProps<T>) => JSX.Element

// Set display name using Object.defineProperty to satisfy TypeScript
Object.defineProperty(VirtualList, 'displayName', {
  value: 'VirtualList',
  writable: false
})

// Grid virtualization component
interface VirtualGridProps<T> {
  items: T[]
  width: number
  height: number
  columnCount: number
  rowHeight: number
  columnWidth: number
  renderCell: (props: { 
    item: T | null
    rowIndex: number
    columnIndex: number
    style: React.CSSProperties 
  }) => ReactNode
  className?: string
  overscan?: number
  gap?: number
}

const VirtualGrid = memo(function VirtualGrid<T>({
  items,
  width,
  height,
  columnCount,
  rowHeight,
  columnWidth,
  renderCell,
  className,
  overscan = 2,
  gap = 0
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const rowCount = Math.ceil(items.length / columnCount)
  const totalHeight = rowCount * (rowHeight + gap) - gap

  // Calculate visible rows
  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / (rowHeight + gap)) - overscan)
    const endRow = Math.min(
      rowCount - 1,
      Math.ceil((scrollTop + height) / (rowHeight + gap)) + overscan
    )

    const visibleCells = []
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columnCount; col++) {
        const itemIndex = row * columnCount + col
        const item = items[itemIndex] || null

        visibleCells.push({
          rowIndex: row,
          columnIndex: col,
          item,
          style: {
            position: 'absolute' as const,
            top: row * (rowHeight + gap),
            left: col * (columnWidth + gap),
            width: columnWidth,
            height: rowHeight
          }
        })
      }
    }

    return visibleCells
  }, [items, scrollTop, height, rowHeight, columnWidth, columnCount, gap, overscan, rowCount])

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ width, height }}
      onScroll={handleScroll}
    >
      <div
        style={{
          position: 'relative',
          width: columnCount * (columnWidth + gap) - gap,
          height: totalHeight
        }}
      >
        {visibleRange.map(({ rowIndex, columnIndex, item, style }) => (
          <div key={`${rowIndex}-${columnIndex}`} style={style}>
            {renderCell({ item, rowIndex, columnIndex, style })}
          </div>
        ))}
      </div>
    </div>
  )
}) as <T>(props: VirtualGridProps<T>) => JSX.Element

// Set display name using Object.defineProperty to satisfy TypeScript
Object.defineProperty(VirtualGrid, 'displayName', {
  value: 'VirtualGrid',
  writable: false
})

export { VirtualList, VirtualGrid }
export type { VirtualListProps, VirtualGridProps }