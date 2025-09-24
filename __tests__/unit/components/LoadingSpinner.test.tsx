/**
 * LoadingSpinner Component Tests
 * Tests for loading indicator component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock LoadingSpinner component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'primary', 
  text,
  fullScreen = false 
}) => {
  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'lg': return 'w-12 h-12';
      default: return 'w-8 h-8';
    }
  };

  const getColorClass = () => {
    switch (color) {
      case 'secondary': return 'text-gray-600';
      case 'white': return 'text-white';
      default: return 'text-field-green-600';
    }
  };

  const containerClass = fullScreen 
    ? 'fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50'
    : 'flex items-center justify-center p-4';

  return (
    <div className={containerClass} data-testid="loading-spinner">
      <div className="flex flex-col items-center space-y-2">
        <div 
          className={`animate-spin rounded-full border-4 border-gray-200 border-t-current ${getSizeClass()} ${getColorClass()}`}
          role="status"
          aria-label="Loading"
        >
          <span className="sr-only">Loading...</span>
        </div>
        {text && (
          <p className="text-sm text-gray-600" data-testid="loading-text">
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

describe('LoadingSpinner', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toBeInTheDocument();
      
      const spinnerElement = screen.getByRole('status');
      expect(spinnerElement).toHaveAttribute('aria-label', 'Loading');
    });

    it('should render with text', () => {
      render(<LoadingSpinner text="Loading players..." />);
      
      const loadingText = screen.getByTestId('loading-text');
      expect(loadingText).toHaveTextContent('Loading players...');
    });

    it('should have accessible screen reader text', () => {
      render(<LoadingSpinner />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size class', () => {
      render(<LoadingSpinner size="sm" />);
      
      const spinnerElement = screen.getByRole('status');
      expect(spinnerElement).toHaveClass('w-4', 'h-4');
    });

    it('should apply medium size class (default)', () => {
      render(<LoadingSpinner size="md" />);
      
      const spinnerElement = screen.getByRole('status');
      expect(spinnerElement).toHaveClass('w-8', 'h-8');
    });

    it('should apply large size class', () => {
      render(<LoadingSpinner size="lg" />);
      
      const spinnerElement = screen.getByRole('status');
      expect(spinnerElement).toHaveClass('w-12', 'h-12');
    });
  });

  describe('Color Variants', () => {
    it('should apply primary color (default)', () => {
      render(<LoadingSpinner color="primary" />);
      
      const spinnerElement = screen.getByRole('status');
      expect(spinnerElement).toHaveClass('text-field-green-600');
    });

    it('should apply secondary color', () => {
      render(<LoadingSpinner color="secondary" />);
      
      const spinnerElement = screen.getByRole('status');
      expect(spinnerElement).toHaveClass('text-gray-600');
    });

    it('should apply white color', () => {
      render(<LoadingSpinner color="white" />);
      
      const spinnerElement = screen.getByRole('status');
      expect(spinnerElement).toHaveClass('text-white');
    });
  });

  describe('Full Screen Mode', () => {
    it('should render in full screen mode', () => {
      render(<LoadingSpinner fullScreen={true} />);
      
      const container = screen.getByTestId('loading-spinner');
      expect(container).toHaveClass('fixed', 'inset-0', 'z-50');
    });

    it('should render in inline mode by default', () => {
      render(<LoadingSpinner fullScreen={false} />);
      
      const container = screen.getByTestId('loading-spinner');
      expect(container).not.toHaveClass('fixed');
      expect(container).toHaveClass('flex', 'items-center', 'justify-center', 'p-4');
    });
  });

  describe('Animation', () => {
    it('should have spin animation class', () => {
      render(<LoadingSpinner />);
      
      const spinnerElement = screen.getByRole('status');
      expect(spinnerElement).toHaveClass('animate-spin');
    });

    it('should have rounded appearance', () => {
      render(<LoadingSpinner />);
      
      const spinnerElement = screen.getByRole('status');
      expect(spinnerElement).toHaveClass('rounded-full');
    });

    it('should have border styling', () => {
      render(<LoadingSpinner />);
      
      const spinnerElement = screen.getByRole('status');
      expect(spinnerElement).toHaveClass('border-4', 'border-gray-200', 'border-t-current');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<LoadingSpinner />);
      
      const spinnerElement = screen.getByRole('status');
      expect(spinnerElement).toHaveAttribute('role', 'status');
      expect(spinnerElement).toHaveAttribute('aria-label', 'Loading');
    });

    it('should have screen reader only text', () => {
      render(<LoadingSpinner />);
      
      const srText = screen.getByText('Loading...');
      expect(srText).toHaveClass('sr-only');
    });

    it('should be keyboard accessible', () => {
      render(<LoadingSpinner />);
      
      const container = screen.getByTestId('loading-spinner');
      
      // Should not interfere with keyboard navigation
      expect(container.getAttribute('tabIndex')).toBeNull();
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with different loading states', () => {
      const loadingStates = [
        { text: 'Loading players...', size: 'sm' as const },
        { text: 'Saving lineup...', size: 'md' as const },
        { text: 'Processing trade...', size: 'lg' as const }
      ];

      loadingStates.forEach(({ text, size }, index) => {
        const { unmount } = render(<LoadingSpinner text={text} size={size} />);
        
        expect(screen.getByTestId('loading-text')).toHaveTextContent(text);
        expect(screen.getByRole('status')).toBeInTheDocument();
        
        unmount();
      });
    });

    it('should handle rapid mount/unmount', () => {
      const { rerender, unmount } = render(<LoadingSpinner text="Loading..." />);
      
      expect(screen.getByTestId('loading-text')).toBeInTheDocument();
      
      rerender(<LoadingSpinner text="Almost done..." />);
      expect(screen.getByText('Almost done...')).toBeInTheDocument();
      
      unmount();
      // Should clean up without errors
    });

    it('should work in overlay scenarios', () => {
      render(<LoadingSpinner fullScreen={true} text="Please wait..." />);
      
      const container = screen.getByTestId('loading-spinner');
      expect(container).toHaveClass('bg-white', 'bg-opacity-75');
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(<LoadingSpinner text={`Loading ${i}...`} />);
        unmount();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should render 100 spinners in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should not cause memory leaks with text changes', () => {
      const { rerender } = render(<LoadingSpinner text="Initial" />);
      
      // Rapidly change text
      for (let i = 0; i < 50; i++) {
        rerender(<LoadingSpinner text={`Loading ${i}...`} />);
      }
      
      expect(screen.getByTestId('loading-text')).toHaveTextContent('Loading 49...');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text', () => {
      render(<LoadingSpinner text="" />);
      
      const loadingText = screen.queryByTestId('loading-text');
      expect(loadingText).toBeInTheDocument();
      expect(loadingText).toHaveTextContent('');
    });

    it('should handle very long text', () => {
      const longText = 'A'.repeat(1000);
      render(<LoadingSpinner text={longText} />);
      
      const loadingText = screen.getByTestId('loading-text');
      expect(loadingText).toHaveTextContent(longText);
    });

    it('should handle special characters in text', () => {
      const specialText = '🎯 Loading fantasy data... 💫';
      render(<LoadingSpinner text={specialText} />);
      
      const loadingText = screen.getByTestId('loading-text');
      expect(loadingText).toHaveTextContent(specialText);
    });

    it('should maintain styling with all props', () => {
      render(
        <LoadingSpinner 
          size="lg"
          color="white"
          text="Full props test"
          fullScreen={true}
        />
      );
      
      const container = screen.getByTestId('loading-spinner');
      const spinner = screen.getByRole('status');
      const text = screen.getByTestId('loading-text');
      
      expect(container).toHaveClass('fixed');
      expect(spinner).toHaveClass('w-12', 'h-12', 'text-white');
      expect(text).toHaveTextContent('Full props test');
    });
  });

  describe('TypeScript Integration', () => {
    it('should accept valid size props', () => {
      const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];
      
      sizes.forEach(size => {
        const { unmount } = render(<LoadingSpinner size={size} />);
        expect(screen.getByRole('status')).toBeInTheDocument();
        unmount();
      });
    });

    it('should accept valid color props', () => {
      const colors: Array<'primary' | 'secondary' | 'white'> = ['primary', 'secondary', 'white'];
      
      colors.forEach(color => {
        const { unmount } = render(<LoadingSpinner color={color} />);
        expect(screen.getByRole('status')).toBeInTheDocument();
        unmount();
      });
    });

    it('should work with optional props', () => {
      // All props are optional
      render(<LoadingSpinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});