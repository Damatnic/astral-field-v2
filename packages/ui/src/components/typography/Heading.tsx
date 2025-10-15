/**
 * Heading component for consistent typography hierarchy
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/**
 * Heading variant styles
 */
const headingVariants = cva(
  'font-semibold tracking-tight text-text-primary',
  {
    variants: {
      size: {
        '6xl': 'text-6xl font-bold leading-tight',
        '5xl': 'text-5xl font-bold leading-tight',
        '4xl': 'text-4xl font-bold leading-tight',
        '3xl': 'text-3xl font-bold leading-snug',
        '2xl': 'text-2xl font-bold leading-snug',
        xl: 'text-xl font-semibold leading-snug',
        lg: 'text-lg font-semibold leading-normal',
        md: 'text-base font-semibold leading-normal',
        sm: 'text-sm font-semibold leading-normal',
        xs: 'text-xs font-semibold leading-normal',
      },
      variant: {
        default: '',
        display: 'font-display font-extrabold tracking-tighter',
        secondary: 'text-text-secondary',
        muted: 'text-text-tertiary',
        inverse: 'text-text-inverse',
      },
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
      },
      truncate: {
        true: 'truncate',
        false: '',
      },
    },
    defaultVariants: {
      size: 'xl',
      variant: 'default',
      align: 'left',
      truncate: false,
    },
  }
);

/**
 * Heading component props
 */
export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  /**
   * The semantic heading level (h1-h6)
   * This determines the HTML tag used for accessibility
   * @default 'h2'
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  
  /**
   * Custom HTML element to render as
   * Overrides the level prop if provided
   */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div' | 'span';
  
  /**
   * Gradient text color
   */
  gradient?: boolean;
  
  /**
   * Custom gradient colors (requires gradient=true)
   */
  gradientFrom?: string;
  gradientTo?: string;
  
  /**
   * Balance text wrapping for better readability
   * @default false
   */
  balance?: boolean;
}

/**
 * Heading component for consistent typography hierarchy.
 * 
 * @example
 * ```tsx
 * <Heading level={1} size="4xl">
 *   Main Page Title
 * </Heading>
 * 
 * <Heading level={2} size="2xl" variant="secondary">
 *   Section Heading
 * </Heading>
 * 
 * <Heading as="h3" size="lg" gradient gradientFrom="blue-500" gradientTo="purple-600">
 *   Feature Heading
 * </Heading>
 * 
 * <Heading size="xl" balance>
 *   This is a longer heading that will be balanced for better readability
 * </Heading>
 * ```
 */
export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ 
    children, 
    className,
    size,
    variant,
    align,
    truncate,
    level = 2,
    as,
    gradient = false,
    gradientFrom = 'blue-500',
    gradientTo = 'purple-600',
    balance = false,
    style,
    ...props 
  }, ref) => {
    // Determine the HTML tag to use
    const Component = as || (`h${level}` as keyof JSX.IntrinsicElements);
    
    const gradientClasses = gradient 
      ? `bg-gradient-to-r from-${gradientFrom} to-${gradientTo} bg-clip-text text-transparent`
      : '';

    const balanceStyles = balance ? { textWrap: 'balance' as any } : {};

    const Comp = Component as any;
    return (
      <Comp
        ref={ref as any}
        className={cn(
          headingVariants({ size, variant, align, truncate }),
          gradientClasses,
          className
        )}
        style={{ ...balanceStyles, ...style }}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

Heading.displayName = 'Heading';

/**
 * Page Title - Large heading for page titles
 */
export const PageTitle = React.forwardRef<HTMLHeadingElement, 
  Omit<HeadingProps, 'level' | 'size'>
>((props, ref) => (
  <Heading ref={ref} level={1} size="4xl" balance {...props} />
));

PageTitle.displayName = 'PageTitle';

/**
 * Section Title - Medium heading for sections
 */
export const SectionTitle = React.forwardRef<HTMLHeadingElement, 
  Omit<HeadingProps, 'level' | 'size'>
>((props, ref) => (
  <Heading ref={ref} level={2} size="2xl" {...props} />
));

SectionTitle.displayName = 'SectionTitle';

/**
 * Card Title - Small heading for cards and components
 */
export const CardTitle = React.forwardRef<HTMLHeadingElement, 
  Omit<HeadingProps, 'level' | 'size'>
>((props, ref) => (
  <Heading ref={ref} level={3} size="lg" {...props} />
));

CardTitle.displayName = 'CardTitle';

/**
 * Display Heading - Extra large decorative heading
 */
export const DisplayHeading = React.forwardRef<HTMLHeadingElement, 
  Omit<HeadingProps, 'variant' | 'size'>
>((props, ref) => (
  <Heading ref={ref} variant="display" size="6xl" balance {...props} />
));

DisplayHeading.displayName = 'DisplayHeading';