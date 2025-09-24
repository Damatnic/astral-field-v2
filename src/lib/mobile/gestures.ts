// Mobile Touch Gesture Handler
// Provides advanced touch gesture recognition for mobile PWA

export interface GestureConfig {
  swipe?: {
    threshold?: number;
    timeout?: number;
  };
  pinch?: {
    threshold?: number;
  };
  tap?: {
    maxDistance?: number;
    maxDuration?: number;
  };
  longPress?: {
    duration?: number;
    maxDistance?: number;
  };
  pull?: {
    threshold?: number;
  };
}

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeEvent {
  direction: 'up' | 'down' | 'left' | 'right';
  distance: number;
  duration: number;
  velocity: number;
  startPoint: TouchPoint;
  endPoint: TouchPoint;
}

export interface PinchEvent {
  scale: number;
  center: TouchPoint;
  distance: number;
}

export interface TapEvent {
  point: TouchPoint;
  tapCount: number;
}

export interface LongPressEvent {
  point: TouchPoint;
  duration: number;
}

export interface PullEvent {
  direction: 'down';
  distance: number;
  progress: number; // 0-1
}

export type GestureEventHandlers = {
  onSwipe?: (event: SwipeEvent) => void;
  onPinch?: (event: PinchEvent) => void;
  onTap?: (event: TapEvent) => void;
  onDoubleTap?: (event: TapEvent) => void;
  onLongPress?: (event: LongPressEvent) => void;
  onPullToRefresh?: (event: PullEvent) => void;
  onPullRelease?: (event: PullEvent) => void;
};

const DEFAULT_CONFIG: Required<GestureConfig> = {
  swipe: {
    threshold: 50,
    timeout: 300
  },
  pinch: {
    threshold: 0.1
  },
  tap: {
    maxDistance: 10,
    maxDuration: 200
  },
  longPress: {
    duration: 500,
    maxDistance: 10
  },
  pull: {
    threshold: 100
  }
};

export class TouchGestureHandler {
  private element: HTMLElement;
  private config: Required<GestureConfig>;
  private handlers: GestureEventHandlers;
  
  // Touch state
  private touches: TouchPoint[] = [];
  private initialTouches: TouchPoint[] = [];
  private tapCount = 0;
  private tapTimer: NodeJS.Timeout | null = null;
  private longPressTimer: NodeJS.Timeout | null = null;
  private isGestureActive = false;
  private isPullToRefreshEnabled = false;
  private pullStartY = 0;
  private pullDistance = 0;

  constructor(
    element: HTMLElement,
    handlers: GestureEventHandlers,
    config: GestureConfig = {}
  ) {
    this.element = element;
    this.handlers = handlers;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.initialize();
  }

  private initialize() {
    // Prevent default touch behaviors
    this.element.style.touchAction = 'none';
    
    // Add event listeners
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
  }

  private handleTouchStart(event: TouchEvent) {
    const now = Date.now();
    
    // Store initial touches
    this.touches = Array.from(event.touches).map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: now
    }));
    
    this.initialTouches = [...this.touches];
    this.isGestureActive = true;

    // Handle pull to refresh start
    if (this.handlers.onPullToRefresh && this.element.scrollTop === 0 && event.touches.length === 1) {
      this.isPullToRefreshEnabled = true;
      this.pullStartY = event.touches[0].clientY;
    }

    // Start long press timer for single touch
    if (event.touches.length === 1 && this.handlers.onLongPress) {
      this.longPressTimer = setTimeout(() => {
        if (this.isGestureActive && this.touches.length === 1) {
          const distance = this.calculateDistance(this.initialTouches[0], this.touches[0]);
          if (distance <= this.config.longPress.maxDistance) {
            this.handlers.onLongPress?.({
              point: this.touches[0],
              duration: now - this.initialTouches[0].timestamp
            });
          }
        }
      }, this.config.longPress.duration);
    }

    // Clear tap timer if new touch starts
    if (this.tapTimer) {
      clearTimeout(this.tapTimer);
      this.tapTimer = null;
    }
  }

  private handleTouchMove(event: TouchEvent) {
    if (!this.isGestureActive) return;

    event.preventDefault(); // Prevent scrolling

    const now = Date.now();
    this.touches = Array.from(event.touches).map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: now
    }));

    // Clear long press if moved too far
    if (this.longPressTimer && this.touches.length === 1) {
      const distance = this.calculateDistance(this.initialTouches[0], this.touches[0]);
      if (distance > this.config.longPress.maxDistance) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }

    // Handle pull to refresh
    if (this.isPullToRefreshEnabled && this.touches.length === 1) {
      const currentY = this.touches[0].y;
      const pullDistance = Math.max(0, currentY - this.pullStartY);
      
      if (pullDistance > 0) {
        this.pullDistance = pullDistance;
        const progress = Math.min(1, pullDistance / this.config.pull.threshold);
        
        this.handlers.onPullToRefresh?.({
          direction: 'down',
          distance: pullDistance,
          progress
        });
      }
    }

    // Handle pinch gesture
    if (event.touches.length === 2 && this.initialTouches.length === 2 && this.handlers.onPinch) {
      const currentDistance = this.calculateDistance(this.touches[0], this.touches[1]);
      const initialDistance = this.calculateDistance(this.initialTouches[0], this.initialTouches[1]);
      const scale = currentDistance / initialDistance;

      if (Math.abs(scale - 1) > this.config.pinch.threshold) {
        const centerX = (this.touches[0].x + this.touches[1].x) / 2;
        const centerY = (this.touches[0].y + this.touches[1].y) / 2;

        this.handlers.onPinch?.({
          scale,
          center: { x: centerX, y: centerY, timestamp: now },
          distance: currentDistance
        });
      }
    }
  }

  private handleTouchEnd(event: TouchEvent) {
    if (!this.isGestureActive) return;

    const now = Date.now();
    const remainingTouches = Array.from(event.touches).map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: now
    }));

    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Handle pull to refresh release
    if (this.isPullToRefreshEnabled && remainingTouches.length === 0) {
      if (this.pullDistance >= this.config.pull.threshold) {
        this.handlers.onPullRelease?.({
          direction: 'down',
          distance: this.pullDistance,
          progress: 1
        });
      }
      this.isPullToRefreshEnabled = false;
      this.pullDistance = 0;
    }

    // Handle swipe gesture (only on final touch release)
    if (remainingTouches.length === 0 && this.initialTouches.length === 1 && this.handlers.onSwipe) {
      const touch = this.touches[0];
      const initialTouch = this.initialTouches[0];
      const distance = this.calculateDistance(initialTouch, touch);
      const duration = now - initialTouch.timestamp;

      if (distance >= this.config.swipe.threshold && duration <= this.config.swipe.timeout) {
        const direction = this.getSwipeDirection(initialTouch, touch);
        const velocity = distance / duration;

        this.handlers.onSwipe?.({
          direction,
          distance,
          duration,
          velocity,
          startPoint: initialTouch,
          endPoint: touch
        });
      }
    }

    // Handle tap gestures (only on final touch release)
    if (remainingTouches.length === 0 && this.initialTouches.length === 1) {
      const touch = this.touches[0];
      const initialTouch = this.initialTouches[0];
      const distance = this.calculateDistance(initialTouch, touch);
      const duration = now - initialTouch.timestamp;

      if (distance <= this.config.tap.maxDistance && duration <= this.config.tap.maxDuration) {
        this.tapCount++;

        // Handle double tap
        if (this.tapCount === 2 && this.handlers.onDoubleTap) {
          this.handlers.onDoubleTap?.({
            point: touch,
            tapCount: this.tapCount
          });
          this.tapCount = 0;
        } else if (this.handlers.onTap) {
          // Wait for potential second tap
          this.tapTimer = setTimeout(() => {
            if (this.tapCount === 1) {
              this.handlers.onTap?.({
                point: touch,
                tapCount: this.tapCount
              });
            }
            this.tapCount = 0;
          }, 300);
        }
      }
    }

    // Update touches array
    this.touches = remainingTouches;

    // End gesture if no touches remaining
    if (remainingTouches.length === 0) {
      this.isGestureActive = false;
    }
  }

  private handleTouchCancel(event: TouchEvent) {
    this.isGestureActive = false;
    this.touches = [];
    this.initialTouches = [];
    this.isPullToRefreshEnabled = false;
    this.pullDistance = 0;

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (this.tapTimer) {
      clearTimeout(this.tapTimer);
      this.tapTimer = null;
    }
  }

  private calculateDistance(point1: TouchPoint, point2: TouchPoint): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getSwipeDirection(start: TouchPoint, end: TouchPoint): 'up' | 'down' | 'left' | 'right' {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  // Public methods
  public destroy() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
    if (this.tapTimer) {
      clearTimeout(this.tapTimer);
    }

    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
  }

  public updateHandlers(handlers: Partial<GestureEventHandlers>) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  public updateConfig(config: Partial<GestureConfig>) {
    this.config = { ...this.config, ...config };
  }
}

// Utility function to create gesture handler
export function createGestureHandler(
  element: HTMLElement,
  handlers: GestureEventHandlers,
  config?: GestureConfig
): TouchGestureHandler {
  return new TouchGestureHandler(element, handlers, config);
}

// React hook for gestures (if using React)
import { useEffect, RefObject, DependencyList } from 'react';

export function useGestures(
  ref: RefObject<HTMLElement>,
  handlers: GestureEventHandlers,
  config?: GestureConfig,
  deps: DependencyList = []
) {
  useEffect(() => {
    if (!ref.current) return;

    const gestureHandler = new TouchGestureHandler(ref.current, handlers, config);

    return () => {
      gestureHandler.destroy();
    };
  }, [ref, ...deps]);
}