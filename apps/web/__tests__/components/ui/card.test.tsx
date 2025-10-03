/**
 * Card Component Tests
 * 
 * Comprehensive test suite for UI Card component and its subcomponents
 * Demonstrates testing of composite components
 */

import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import React from 'react'

describe('Card Components', () => {
  describe('Card', () => {
    it('should render without crashing', () => {
      render(<Card>Card content</Card>)
      
      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('should render as a div element', () => {
      const { container } = render(<Card>Content</Card>)
      
      const card = container.firstChild
      expect(card?.nodeName).toBe('DIV')
    })

    it('should apply default classes', () => {
      const { container } = render(<Card>Content</Card>)
      
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('border')
      expect(card).toHaveClass('bg-card')
    })

    it('should accept custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>)
      
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('custom-class')
      expect(card).toHaveClass('rounded-lg')
    })

    it('should forward ref', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<Card ref={ref}>Content</Card>)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should accept HTML attributes', () => {
      const { container } = render(<Card id="test-card" data-testid="card">Content</Card>)
      
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('id', 'test-card')
      expect(card).toHaveAttribute('data-testid', 'card')
    })

    it('should render children correctly', () => {
      render(
        <Card>
          <div>Child 1</div>
          <div>Child 2</div>
        </Card>
      )
      
      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
    })

    it('should have correct display name', () => {
      expect(Card.displayName).toBe('Card')
    })
  })

  describe('CardHeader', () => {
    it('should render without crashing', () => {
      render(<CardHeader>Header content</CardHeader>)
      
      expect(screen.getByText('Header content')).toBeInTheDocument()
    })

    it('should render as a div element', () => {
      const { container } = render(<CardHeader>Content</CardHeader>)
      
      const header = container.firstChild
      expect(header?.nodeName).toBe('DIV')
    })

    it('should apply default classes', () => {
      const { container } = render(<CardHeader>Content</CardHeader>)
      
      const header = container.firstChild as HTMLElement
      expect(header).toHaveClass('flex')
      expect(header).toHaveClass('flex-col')
      expect(header).toHaveClass('p-6')
    })

    it('should accept custom className', () => {
      const { container } = render(<CardHeader className="custom-header">Content</CardHeader>)
      
      const header = container.firstChild as HTMLElement
      expect(header).toHaveClass('custom-header')
      expect(header).toHaveClass('flex')
    })

    it('should forward ref', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<CardHeader ref={ref}>Content</CardHeader>)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should have correct display name', () => {
      expect(CardHeader.displayName).toBe('CardHeader')
    })
  })

  describe('CardTitle', () => {
    it('should render without crashing', () => {
      render(<CardTitle>Title text</CardTitle>)
      
      expect(screen.getByText('Title text')).toBeInTheDocument()
    })

    it('should render as an h3 element', () => {
      render(<CardTitle>Title</CardTitle>)
      
      const title = screen.getByText('Title')
      expect(title.tagName).toBe('H3')
    })

    it('should apply default classes', () => {
      render(<CardTitle>Title</CardTitle>)
      
      const title = screen.getByText('Title')
      expect(title).toHaveClass('text-2xl')
      expect(title).toHaveClass('font-semibold')
    })

    it('should accept custom className', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>)
      
      const title = screen.getByText('Title')
      expect(title).toHaveClass('custom-title')
      expect(title).toHaveClass('text-2xl')
    })

    it('should forward ref', () => {
      const ref = React.createRef<HTMLParagraphElement>()
      render(<CardTitle ref={ref}>Title</CardTitle>)
      
      expect(ref.current).toBeTruthy()
    })

    it('should have correct display name', () => {
      expect(CardTitle.displayName).toBe('CardTitle')
    })
  })

  describe('CardDescription', () => {
    it('should render without crashing', () => {
      render(<CardDescription>Description text</CardDescription>)
      
      expect(screen.getByText('Description text')).toBeInTheDocument()
    })

    it('should render as a p element', () => {
      render(<CardDescription>Description</CardDescription>)
      
      const description = screen.getByText('Description')
      expect(description.tagName).toBe('P')
    })

    it('should apply default classes', () => {
      render(<CardDescription>Description</CardDescription>)
      
      const description = screen.getByText('Description')
      expect(description).toHaveClass('text-sm')
      expect(description).toHaveClass('text-muted-foreground')
    })

    it('should accept custom className', () => {
      render(<CardDescription className="custom-desc">Description</CardDescription>)
      
      const description = screen.getByText('Description')
      expect(description).toHaveClass('custom-desc')
      expect(description).toHaveClass('text-sm')
    })

    it('should forward ref', () => {
      const ref = React.createRef<HTMLParagraphElement>()
      render(<CardDescription ref={ref}>Description</CardDescription>)
      
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement)
    })

    it('should have correct display name', () => {
      expect(CardDescription.displayName).toBe('CardDescription')
    })
  })

  describe('CardContent', () => {
    it('should render without crashing', () => {
      render(<CardContent>Content text</CardContent>)
      
      expect(screen.getByText('Content text')).toBeInTheDocument()
    })

    it('should render as a div element', () => {
      const { container } = render(<CardContent>Content</CardContent>)
      
      const content = container.firstChild
      expect(content?.nodeName).toBe('DIV')
    })

    it('should apply default classes', () => {
      const { container } = render(<CardContent>Content</CardContent>)
      
      const content = container.firstChild as HTMLElement
      expect(content).toHaveClass('p-6')
      expect(content).toHaveClass('pt-0')
    })

    it('should accept custom className', () => {
      const { container } = render(<CardContent className="custom-content">Content</CardContent>)
      
      const content = container.firstChild as HTMLElement
      expect(content).toHaveClass('custom-content')
      expect(content).toHaveClass('p-6')
    })

    it('should forward ref', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<CardContent ref={ref}>Content</CardContent>)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should have correct display name', () => {
      expect(CardContent.displayName).toBe('CardContent')
    })
  })

  describe('CardFooter', () => {
    it('should render without crashing', () => {
      render(<CardFooter>Footer text</CardFooter>)
      
      expect(screen.getByText('Footer text')).toBeInTheDocument()
    })

    it('should render as a div element', () => {
      const { container } = render(<CardFooter>Footer</CardFooter>)
      
      const footer = container.firstChild
      expect(footer?.nodeName).toBe('DIV')
    })

    it('should apply default classes', () => {
      const { container } = render(<CardFooter>Footer</CardFooter>)
      
      const footer = container.firstChild as HTMLElement
      expect(footer).toHaveClass('flex')
      expect(footer).toHaveClass('items-center')
      expect(footer).toHaveClass('p-6')
    })

    it('should accept custom className', () => {
      const { container } = render(<CardFooter className="custom-footer">Footer</CardFooter>)
      
      const footer = container.firstChild as HTMLElement
      expect(footer).toHaveClass('custom-footer')
      expect(footer).toHaveClass('flex')
    })

    it('should forward ref', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<CardFooter ref={ref}>Footer</CardFooter>)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should have correct display name', () => {
      expect(CardFooter.displayName).toBe('CardFooter')
    })
  })

  describe('Composite Card', () => {
    it('should render complete card with all components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>Test Content</CardContent>
          <CardFooter>Test Footer</CardFooter>
        </Card>
      )
      
      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
      expect(screen.getByText('Test Footer')).toBeInTheDocument()
    })

    it('should maintain proper structure', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      )
      
      const card = container.firstChild as HTMLElement
      expect(card.children).toHaveLength(2)
    })

    it('should work without all components', () => {
      render(
        <Card>
          <CardTitle>Just Title</CardTitle>
          <CardContent>Just Content</CardContent>
        </Card>
      )
      
      expect(screen.getByText('Just Title')).toBeInTheDocument()
      expect(screen.getByText('Just Content')).toBeInTheDocument()
    })

    it('should handle complex nested content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>
              <span>Complex</span> <strong>Title</strong>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p>Paragraph 1</p>
              <p>Paragraph 2</p>
            </div>
          </CardContent>
        </Card>
      )
      
      expect(screen.getByText('Complex')).toBeInTheDocument()
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument()
      expect(screen.getByText('Paragraph 2')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should support aria attributes on Card', () => {
      const { container } = render(
        <Card aria-label="Test card" role="article">
          Content
        </Card>
      )
      
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('aria-label', 'Test card')
      expect(card).toHaveAttribute('role', 'article')
    })

    it('should support aria attributes on CardTitle', () => {
      render(<CardTitle aria-level={1}>Title</CardTitle>)
      
      const title = screen.getByText('Title')
      expect(title).toHaveAttribute('aria-level', '1')
    })

    it('should be keyboard navigable when interactive', () => {
      const { container } = render(
        <Card tabIndex={0}>
          <CardContent>Interactive Card</CardContent>
        </Card>
      )
      
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty Card', () => {
      const { container } = render(<Card />)
      
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should handle empty CardContent', () => {
      render(<CardContent />)
      
      const { container } = render(<CardContent />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should handle very long content', () => {
      const longText = 'a'.repeat(1000)
      render(<CardContent>{longText}</CardContent>)
      
      expect(screen.getByText(longText)).toBeInTheDocument()
    })

    it('should handle special characters', () => {
      render(
        <Card>
          <CardTitle>{"<>&\"'"}</CardTitle>
          <CardContent>Special chars</CardContent>
        </Card>
      )
      
      expect(screen.getByText('<>&"\'')).toBeInTheDocument()
    })

    it('should handle null children', () => {
      render(
        <Card>
          {null}
          <CardContent>Content</CardContent>
        </Card>
      )
      
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('should handle undefined children', () => {
      render(
        <Card>
          {undefined}
          <CardContent>Content</CardContent>
        </Card>
      )
      
      expect(screen.getByText('Content')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should render quickly', () => {
      const start = Date.now()
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      )
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(100)
    })

    it('should handle multiple cards efficiently', () => {
      const start = Date.now()
      render(
        <>
          {Array.from({ length: 10 }, (_, i) => (
            <Card key={i}>
              <CardTitle>Card {i}</CardTitle>
              <CardContent>Content {i}</CardContent>
            </Card>
          ))}
        </>
      )
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(500)
    })
  })

  describe('Styling Combinations', () => {
    it('should combine custom classes on all components', () => {
      const { container } = render(
        <Card className="card-custom">
          <CardHeader className="header-custom">
            <CardTitle className="title-custom">Title</CardTitle>
            <CardDescription className="desc-custom">Description</CardDescription>
          </CardHeader>
          <CardContent className="content-custom">Content</CardContent>
          <CardFooter className="footer-custom">Footer</CardFooter>
        </Card>
      )
      
      expect(container.querySelector('.card-custom')).toBeInTheDocument()
      expect(container.querySelector('.header-custom')).toBeInTheDocument()
      expect(container.querySelector('.title-custom')).toBeInTheDocument()
      expect(container.querySelector('.desc-custom')).toBeInTheDocument()
      expect(container.querySelector('.content-custom')).toBeInTheDocument()
      expect(container.querySelector('.footer-custom')).toBeInTheDocument()
    })
  })
})
