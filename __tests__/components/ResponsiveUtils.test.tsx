import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  ResponsiveNavigation, 
  useBreakpoint, 
  useTouchDevice, 
  useSwipeGesture,
  useScrollDirection,
  SafeAreaProvider 
} from '@/components/mobile/ResponsiveUtils';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

// Mock components
jest.mock('@/components/Navigation', () => {
  return function MockNavigation() {
    return <div data-testid="desktop-navigation">Desktop Navigation</div>;
  };
});

jest.mock('@/components/mobile/MobileOptimizedNavigation', () => {
  return function MockMobileHeader() {
    return <div data-testid="mobile-navigation">Mobile Navigation</div>;
  };
});

// Mock window.innerWidth and window.innerHeight
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

// Mock navigator.userAgent
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
});

// Mock navigator.maxTouchPoints
Object.defineProperty(navigator, 'maxTouchPoints', {
  writable: true,
  value: 0,
});

// Test component for useBreakpoint hook
const BreakpointTestComponent = () => {
  const { breakpoint, isMobile, isTablet, isDesktop } = useBreakpoint();
  return (
    <div>
      <span data-testid="breakpoint">{breakpoint}</span>
      <span data-testid="is-mobile">{isMobile.toString()}</span>
      <span data-testid="is-tablet">{isTablet.toString()}</span>
      <span data-testid="is-desktop">{isDesktop.toString()}</span>
    </div>
  );
};

// Test component for useTouchDevice hook
const TouchTestComponent = () => {
  const isTouch = useTouchDevice();
  return <span data-testid="is-touch">{isTouch.toString()}</span>;
};

// Test component for useSwipeGesture hook
const SwipeTestComponent = () => {
  const [swipeDirection, setSwipeDirection] = React.useState<string>('');
  
  const swipeHandlers = useSwipeGesture(
    () => setSwipeDirection('left'),
    () => setSwipeDirection('right'),
    () => setSwipeDirection('up'),
    () => setSwipeDirection('down'),
    50
  );

  return (
    <div
      data-testid="swipe-area"
      {...swipeHandlers}
      style={{ width: 200, height: 200 }}
    >
      <span data-testid="swipe-direction">{swipeDirection}</span>
    </div>
  );
};

// Test component for useScrollDirection hook
const ScrollTestComponent = () => {
  const scrollDirection = useScrollDirection();
  return <span data-testid="scroll-direction">{scrollDirection || 'none'}</span>;
};

describe('ResponsiveNavigation', () => {
  beforeEach(() => {
    window.innerWidth = 1024;
    window.innerHeight = 768;
    // @ts-ignore - test environment
    navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  });

  it('should render desktop navigation on large screens', () => {
    window.innerWidth = 1024;
    
    render(<ResponsiveNavigation />);
    
    expect(screen.getByTestId('desktop-navigation')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-navigation')).not.toBeInTheDocument();
  });

  it('should render mobile navigation on small screens', () => {
    window.innerWidth = 600;
    
    render(<ResponsiveNavigation />);
    
    // Trigger resize event
    act(() => {
      fireEvent(window, new Event('resize'));
    });
    
    expect(screen.queryByTestId('desktop-navigation')).not.toBeInTheDocument();
    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
  });

  it('should not render on login page', () => {
    jest.doMock('next/navigation', () => ({
      usePathname: () => '/login',
    }));
    
    const { container } = render(<ResponsiveNavigation />);
    expect(container.firstChild).toBeNull();
  });
});

describe('useBreakpoint', () => {
  it('should detect desktop breakpoint', () => {
    window.innerWidth = 1280;
    
    render(<BreakpointTestComponent />);
    
    act(() => {
      fireEvent(window, new Event('resize'));
    });
    
    expect(screen.getByTestId('breakpoint')).toHaveTextContent('xl');
    expect(screen.getByTestId('is-desktop')).toHaveTextContent('true');
    expect(screen.getByTestId('is-mobile')).toHaveTextContent('false');
  });

  it('should detect mobile breakpoint', () => {
    window.innerWidth = 500;
    
    render(<BreakpointTestComponent />);
    
    act(() => {
      fireEvent(window, new Event('resize'));
    });
    
    expect(screen.getByTestId('breakpoint')).toHaveTextContent('sm');
    expect(screen.getByTestId('is-mobile')).toHaveTextContent('true');
    expect(screen.getByTestId('is-desktop')).toHaveTextContent('false');
  });

  it('should detect tablet breakpoint', () => {
    window.innerWidth = 900;
    
    render(<BreakpointTestComponent />);
    
    act(() => {
      fireEvent(window, new Event('resize'));
    });
    
    expect(screen.getByTestId('breakpoint')).toHaveTextContent('lg');
    expect(screen.getByTestId('is-tablet')).toHaveTextContent('true');
    expect(screen.getByTestId('is-mobile')).toHaveTextContent('false');
  });
});

describe('useTouchDevice', () => {
  it('should detect touch device with maxTouchPoints', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      value: 5,
    });
    
    render(<TouchTestComponent />);
    
    expect(screen.getByTestId('is-touch')).toHaveTextContent('true');
  });

  it('should detect non-touch device', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      value: 0,
    });
    
    delete (window as any).ontouchstart;
    
    render(<TouchTestComponent />);
    
    expect(screen.getByTestId('is-touch')).toHaveTextContent('false');
  });

  it('should detect touch device with ontouchstart', () => {
    (window as any).ontouchstart = true;
    
    render(<TouchTestComponent />);
    
    expect(screen.getByTestId('is-touch')).toHaveTextContent('true');
  });
});

describe('useSwipeGesture', () => {
  it('should detect left swipe', () => {
    render(<SwipeTestComponent />);
    
    const swipeArea = screen.getByTestId('swipe-area');
    
    // Simulate swipe left
    fireEvent.touchStart(swipeArea, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    
    fireEvent.touchMove(swipeArea, {
      touches: [{ clientX: 40, clientY: 100 }],
    });
    
    fireEvent.touchEnd(swipeArea);
    
    expect(screen.getByTestId('swipe-direction')).toHaveTextContent('left');
  });

  it('should detect right swipe', () => {
    render(<SwipeTestComponent />);
    
    const swipeArea = screen.getByTestId('swipe-area');
    
    // Simulate swipe right
    fireEvent.touchStart(swipeArea, {
      touches: [{ clientX: 40, clientY: 100 }],
    });
    
    fireEvent.touchMove(swipeArea, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    
    fireEvent.touchEnd(swipeArea);
    
    expect(screen.getByTestId('swipe-direction')).toHaveTextContent('right');
  });

  it('should detect up swipe', () => {
    render(<SwipeTestComponent />);
    
    const swipeArea = screen.getByTestId('swipe-area');
    
    // Simulate swipe up
    fireEvent.touchStart(swipeArea, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    
    fireEvent.touchMove(swipeArea, {
      touches: [{ clientX: 100, clientY: 40 }],
    });
    
    fireEvent.touchEnd(swipeArea);
    
    expect(screen.getByTestId('swipe-direction')).toHaveTextContent('up');
  });

  it('should not trigger swipe below threshold', () => {
    render(<SwipeTestComponent />);
    
    const swipeArea = screen.getByTestId('swipe-area');
    
    // Simulate small movement (below 50px threshold)
    fireEvent.touchStart(swipeArea, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    
    fireEvent.touchMove(swipeArea, {
      touches: [{ clientX: 120, clientY: 100 }],
    });
    
    fireEvent.touchEnd(swipeArea);
    
    expect(screen.getByTestId('swipe-direction')).toHaveTextContent('');
  });
});

describe('useScrollDirection', () => {
  it('should detect scroll down', () => {
    render(<ScrollTestComponent />);
    
    // Mock scrollY
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 100,
    });
    
    act(() => {
      fireEvent.scroll(window, { target: { scrollY: 100 } });
    });
    
    // Scroll down more
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 150,
    });
    
    act(() => {
      fireEvent.scroll(window, { target: { scrollY: 150 } });
    });
    
    expect(screen.getByTestId('scroll-direction')).toHaveTextContent('down');
  });

  it('should detect scroll up', () => {
    render(<ScrollTestComponent />);
    
    // Start at bottom
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 150,
    });
    
    act(() => {
      fireEvent.scroll(window, { target: { scrollY: 150 } });
    });
    
    // Scroll up
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 100,
    });
    
    act(() => {
      fireEvent.scroll(window, { target: { scrollY: 100 } });
    });
    
    expect(screen.getByTestId('scroll-direction')).toHaveTextContent('up');
  });
});

describe('SafeAreaProvider', () => {
  it('should render children', () => {
    render(
      <SafeAreaProvider>
        <div data-testid="child">Test Content</div>
      </SafeAreaProvider>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should handle orientation change', () => {
    render(
      <SafeAreaProvider>
        <div data-testid="child">Test Content</div>
      </SafeAreaProvider>
    );
    
    act(() => {
      fireEvent(window, new Event('orientationchange'));
    });
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});