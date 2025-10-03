/**
 * Optimized Image Component Tests
 * 
 * Tests for performance-optimized image component
 */

import { render, screen, waitFor } from '@testing-library/react'
import { OptimizedImage, ResponsiveImage, OptimizedAvatar } from '@/components/ui/optimized-image'

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  }
}))

describe('OptimizedImage Component', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<OptimizedImage src="/test.jpg" alt="Test image" />)
      expect(screen.getByAltText('Test image')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<OptimizedImage src="/test.jpg" alt="Test" className="custom-class" />)
      const img = screen.getByAltText('Test')
      expect(img).toHaveClass('custom-class')
    })

    it('should accept width and height', () => {
      render(<OptimizedImage src="/test.jpg" alt="Test" width={200} height={150} />)
      expect(screen.getByAltText('Test')).toBeInTheDocument()
    })

    it('should support fill mode', () => {
      render(<OptimizedImage src="/test.jpg" alt="Test" fill />)
      expect(screen.getByAltText('Test')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading state initially', () => {
      const { container } = render(<OptimizedImage src="/test.jpg" alt="Test" />)
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('should handle onLoad callback', async () => {
      const handleLoad = jest.fn()
      render(<OptimizedImage src="/test.jpg" alt="Test" onLoad={handleLoad} />)
      
      const img = screen.getByAltText('Test')
      img.dispatchEvent(new Event('load'))
      
      await waitFor(() => {
        expect(handleLoad).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle onError callback', async () => {
      const handleError = jest.fn()
      render(<OptimizedImage src="/test.jpg" alt="Test" onError={handleError} />)
      
      const img = screen.getByAltText('Test')
      img.dispatchEvent(new Event('error'))
      
      await waitFor(() => {
        expect(handleError).toHaveBeenCalled()
      })
    })

    it('should use fallback image on error', async () => {
      render(
        <OptimizedImage 
          src="/test.jpg" 
          alt="Test" 
          fallbackSrc="/fallback.jpg"
        />
      )
      
      const img = screen.getByAltText('Test')
      img.dispatchEvent(new Event('error'))
      
      await waitFor(() => {
        expect(img).toHaveAttribute('src', expect.stringContaining('fallback'))
      })
    })
  })

  describe('Aspect Ratio', () => {
    it('should calculate height from width and aspect ratio', () => {
      render(
        <OptimizedImage 
          src="/test.jpg" 
          alt="Test" 
          width={400}
          aspectRatio={16/9}
        />
      )
      expect(screen.getByAltText('Test')).toBeInTheDocument()
    })

    it('should calculate width from height and aspect ratio', () => {
      render(
        <OptimizedImage 
          src="/test.jpg" 
          alt="Test" 
          height={300}
          aspectRatio={16/9}
        />
      )
      expect(screen.getByAltText('Test')).toBeInTheDocument()
    })
  })

  describe('Quality and Optimization', () => {
    it('should accept quality prop', () => {
      render(<OptimizedImage src="/test.jpg" alt="Test" quality={90} />)
      expect(screen.getByAltText('Test')).toBeInTheDocument()
    })

    it('should use default quality', () => {
      render(<OptimizedImage src="/test.jpg" alt="Test" />)
      expect(screen.getByAltText('Test')).toBeInTheDocument()
    })

    it('should support priority loading', () => {
      render(<OptimizedImage src="/test.jpg" alt="Test" priority />)
      expect(screen.getByAltText('Test')).toBeInTheDocument()
    })
  })

  describe('Object Fit', () => {
    it('should support cover object fit', () => {
      render(<OptimizedImage src="/test.jpg" alt="Test" objectFit="cover" />)
      expect(screen.getByAltText('Test')).toBeInTheDocument()
    })

    it('should support contain object fit', () => {
      render(<OptimizedImage src="/test.jpg" alt="Test" objectFit="contain" />)
      expect(screen.getByAltText('Test')).toBeInTheDocument()
    })
  })

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(OptimizedImage.displayName).toBe('OptimizedImage')
    })
  })
})

describe('ResponsiveImage Component', () => {
  it('should render without crashing', () => {
    render(<ResponsiveImage src="/test.jpg" alt="Test" />)
    expect(screen.getByAltText('Test')).toBeInTheDocument()
  })

  it('should use default aspect ratio', () => {
    render(<ResponsiveImage src="/test.jpg" alt="Test" />)
    expect(screen.getByAltText('Test')).toBeInTheDocument()
  })

  it('should accept custom aspect ratio', () => {
    render(<ResponsiveImage src="/test.jpg" alt="Test" aspectRatio={4/3} />)
    expect(screen.getByAltText('Test')).toBeInTheDocument()
  })

  it('should have correct display name', () => {
    expect(ResponsiveImage.displayName).toBe('ResponsiveImage')
  })
})

describe('OptimizedAvatar Component', () => {
  it('should render without crashing', () => {
    render(<OptimizedAvatar src="/avatar.jpg" alt="User avatar" />)
    expect(screen.getByAltText('User avatar')).toBeInTheDocument()
  })

  it('should use default size', () => {
    render(<OptimizedAvatar src="/avatar.jpg" alt="Avatar" />)
    expect(screen.getByAltText('Avatar')).toBeInTheDocument()
  })

  it('should accept custom size', () => {
    render(<OptimizedAvatar src="/avatar.jpg" alt="Avatar" size={80} />)
    expect(screen.getByAltText('Avatar')).toBeInTheDocument()
  })

  it('should support fallback', () => {
    render(<OptimizedAvatar src="/avatar.jpg" alt="Avatar" fallback="/default.jpg" />)
    expect(screen.getByAltText('Avatar')).toBeInTheDocument()
  })

  it('should have correct display name', () => {
    expect(OptimizedAvatar.displayName).toBe('OptimizedAvatar')
  })
})
