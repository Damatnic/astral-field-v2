/**
 * Stack component for consistent vertical and horizontal spacing
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/**
 * Stack variant styles
 */
const stackVariants = cva(
  'flex',
  {
    variants: {
      direction: {
        column: 'flex-col',
        row: 'flex-row',
        'column-reverse': 'flex-col-reverse',
        'row-reverse': 'flex-row-reverse',
      },
      gap: {
        none: 'gap-0',
        xs: 'gap-2',
        sm: 'gap-3',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8',
        '2xl': 'gap-12',
      },
      align: {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
        baseline: 'items-baseline',
      },
      justify: {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly',
      },
      wrap: {
        wrap: 'flex-wrap',
        nowrap: 'flex-nowrap',
        'wrap-reverse': 'flex-wrap-reverse',
      },
    },
    defaultVariants: {
      direction: 'column',
      gap: 'md',
      align: 'stretch',
      justify: 'start',
      wrap: 'nowrap',
    },
  }
);

/**
 * Stack component props
 */
export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackVariants> {
  /**
   * Stack content
   */
  children: React.ReactNode;
  
  /**
   * Element type to render as
   * @default 'div'
   */
  as?: keyof JSX.IntrinsicElements;
  
  /**
   * Whether to apply full width
   * @default false
   */
  fullWidth?: boolean;
  
  /**
   * Whether to apply full height
   * @default false
   */
  fullHeight?: boolean;
  
  /**
   * Custom spacing between items (CSS gap value)
   */
  spacing?: string;
  
  /**
   * Responsive gap values
   */
  responsiveGap?: {
    sm?: StackProps['gap'];
    md?: StackProps['gap'];
    lg?: StackProps['gap'];
    xl?: StackProps['gap'];
  };
}

/**
 * Stack component for flexible layout with consistent spacing.
 * 
 * @example
 * ```tsx
 * <Stack gap="lg">
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </Stack>
 * 
 * <Stack direction="row" justify="between" align="center">
 *   <Heading>Title</Heading>
 *   <Button>Action</Button>
 * </Stack>
 * 
 * <Stack 
 *   direction="row" 
 *   wrap="wrap" 
 *   responsiveGap={{ sm: 'sm', lg: 'lg' }}
 * >
 *   <PlayerCard />
 *   <PlayerCard />
 *   <PlayerCard />
 * </Stack>
 * ```
 */
export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ 
    children, 
    className,
    direction,
    gap,
    align,
    justify,
    wrap,
    as: Component = 'div',
    fullWidth = false,
    fullHeight = false,
    spacing,
    responsiveGap,
    style,
    ...props 
  }, ref) => {
    // Generate responsive gap classes
    const responsiveGapClasses = responsiveGap ? Object.entries(responsiveGap)
      .map(([breakpoint, gapValue]) => {
        const prefix = breakpoint === 'sm' ? '' : `${breakpoint}:`;
        const gapClass = stackVariants({ gap: gapValue }).split(' ').find(cls => cls.includes('gap-'));
        return `${prefix}${gapClass}`;
      })
      .join(' ') : '';

    const customStyles = spacing ? { ...style, gap: spacing } : style;

    return (
      <Component
        ref={ref}
        className={cn(
          stackVariants({ 
            direction, 
            gap: responsiveGap ? 'none' : gap, 
            align, 
            justify, 
            wrap 
          }),
          fullWidth && 'w-full',
          fullHeight && 'h-full',
          responsiveGapClasses,
          className
        )}
        style={customStyles}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Stack.displayName = 'Stack';

/**
 * Vertical Stack - Shorthand for column direction
 */
export const VStack = React.forwardRef<HTMLDivElement, 
  Omit<StackProps, 'direction'>
>((props, ref) => (
  <Stack ref={ref} direction="column" {...props} />
));

VStack.displayName = 'VStack';

/**
 * Horizontal Stack - Shorthand for row direction
 */
export const HStack = React.forwardRef<HTMLDivElement, 
  Omit<StackProps, 'direction'>
>((props, ref) => (
  <Stack ref={ref} direction="row" {...props} />
));

HStack.displayName = 'HStack';

/**
 * Center Stack - Centers content both horizontally and vertically
 */
export const CenterStack = React.forwardRef<HTMLDivElement, StackProps>(
  (props, ref) => (
    <Stack 
      ref={ref} 
      align="center" 
      justify="center" 
      fullWidth 
      fullHeight 
      {...props} 
    />
  )
);

CenterStack.displayName = 'CenterStack';

/**
 * Inline Stack - Horizontal stack with wrap and center alignment
 */
export const InlineStack = React.forwardRef<HTMLDivElement, 
  Omit<StackProps, 'direction' | 'wrap'>
>((props, ref) => (
  <Stack 
    ref={ref} 
    direction="row" 
    wrap="wrap" 
    align="center"
    {...props} 
  />
));

InlineStack.displayName = 'InlineStack';

/**
 * Split Stack - Horizontal stack with space between items
 */
export const SplitStack = React.forwardRef<HTMLDivElement, 
  Omit<StackProps, 'direction' | 'justify'>
>((props, ref) => (
  <Stack 
    ref={ref} 
    direction="row" 
    justify="between" 
    align="center"
    {...props} 
  />
));

SplitStack.displayName = 'SplitStack';