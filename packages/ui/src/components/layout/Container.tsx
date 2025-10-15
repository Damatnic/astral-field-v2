/**
 * Container component for consistent layout and responsive design
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/**
 * Container variant styles
 */
const containerVariants = cva(
  'mx-auto w-full',
  {
    variants: {
      size: {
        xs: 'max-w-screen-xs px-4',
        sm: 'max-w-screen-sm px-4',
        md: 'max-w-screen-md px-6',
        lg: 'max-w-screen-lg px-6',
        xl: 'max-w-screen-xl px-8',
        '2xl': 'max-w-screen-2xl px-8',
        full: 'max-w-full px-4',
        none: 'max-w-none px-0',
      },
      padding: {
        none: 'px-0',
        xs: 'px-2',
        sm: 'px-4',
        md: 'px-6',
        lg: 'px-8',
        xl: 'px-12',
      },
      center: {
        true: 'mx-auto',
        false: 'mx-0',
      },
    },
    defaultVariants: {
      size: 'xl',
      center: true,
    },
  }
);

/**
 * Container component props
 */
export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  /**
   * Container content
   */
  children: React.ReactNode;
  
  /**
   * Element type to render as
   * @default 'div'
   */
  as?: keyof JSX.IntrinsicElements;
  
  /**
   * Whether to apply fluid responsive behavior
   * @default false
   */
  fluid?: boolean;
  
  /**
   * Custom breakpoints for responsive behavior
   */
  breakpoints?: {
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    '2xl'?: string;
  };
}

/**
 * Container component for consistent layout spacing and responsive design.
 * 
 * @example
 * ```tsx
 * <Container size="lg">
 *   <h1>Page Content</h1>
 * </Container>
 * 
 * <Container as="main" size="full" padding="none">
 *   <Hero />
 * </Container>
 * 
 * <Container fluid>
 *   <ResponsiveContent />
 * </Container>
 * ```
 */
export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ 
    children, 
    className, 
    size, 
    padding,
    center,
    as: Component = 'div',
    fluid = false,
    breakpoints,
    ...props 
  }, ref) => {
    // Create responsive classes if fluid mode is enabled
    const responsiveClasses = fluid && breakpoints ? Object.entries(breakpoints)
      .map(([breakpoint, value]) => {
        const prefix = breakpoint === 'sm' ? '' : `${breakpoint}:`;
        return `${prefix}max-w-[${value}]`;
      })
      .join(' ') : '';

    const Comp = Component as any;
    return (
      <Comp
        ref={ref}
        className={cn(
          containerVariants({ 
            size: fluid ? 'none' : size, 
            padding,
            center 
          }),
          fluid && 'max-w-full',
          responsiveClasses,
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

Container.displayName = 'Container';

/**
 * Preset container components for common use cases
 */

/**
 * Page container with standard content width
 */
export const PageContainer = React.forwardRef<HTMLDivElement, 
  Omit<ContainerProps, 'size' | 'as'>
>((props, ref) => (
  <Container ref={ref} as="main" size="xl" {...props} />
));

PageContainer.displayName = 'PageContainer';

/**
 * Section container for content sections
 */
export const SectionContainer = React.forwardRef<HTMLElement, 
  Omit<ContainerProps, 'as'> & { as?: 'section' | 'div' | 'article' }
>((props, ref) => (
  <Container ref={ref as any} as="section" size="lg" {...props} />
));

SectionContainer.displayName = 'SectionContainer';

/**
 * Hero container for full-width hero sections
 */
export const HeroContainer = React.forwardRef<HTMLElement, 
  Omit<ContainerProps, 'size' | 'as'>
>((props, ref) => (
  <Container 
    ref={ref as any} 
    as="section" 
    size="full" 
    padding="none"
    className="relative overflow-hidden"
    {...props} 
  />
));

HeroContainer.displayName = 'HeroContainer';

/**
 * Card container with consistent padding and background
 */
export const CardContainer = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, ...props }, ref) => (
    <Container
      ref={ref}
      size="none"
      padding="md"
      center={false}
      className={cn(
        'bg-surface-primary border border-border-primary rounded-lg shadow-card',
        className
      )}
      {...props}
    />
  )
);

CardContainer.displayName = 'CardContainer';