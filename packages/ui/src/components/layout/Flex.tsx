/**
 * Flex component for flexbox layouts
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/**
 * Flex variant styles
 */
const flexVariants = cva(
  'flex',
  {
    variants: {
      direction: {
        row: 'flex-row',
        'row-reverse': 'flex-row-reverse',
        col: 'flex-col',
        'col-reverse': 'flex-col-reverse',
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
        nowrap: 'flex-nowrap',
        wrap: 'flex-wrap',
        'wrap-reverse': 'flex-wrap-reverse',
      },
      gap: {
        none: 'gap-0',
        xs: 'gap-1',
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8',
        '2xl': 'gap-12',
      },
      grow: {
        0: 'flex-grow-0',
        1: 'flex-grow',
      },
      shrink: {
        0: 'flex-shrink-0',
        1: 'flex-shrink',
      },
    },
    defaultVariants: {
      direction: 'row',
      align: 'stretch',
      justify: 'start',
      wrap: 'nowrap',
      gap: 'none',
      grow: 0,
      shrink: 1,
    },
  }
);

/**
 * Flex component props
 */
export interface FlexProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof flexVariants> {
  /**
   * Flex content
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
   * Custom flex basis
   */
  basis?: string;
  
  /**
   * Responsive direction
   */
  responsiveDirection?: {
    sm?: FlexProps['direction'];
    md?: FlexProps['direction'];
    lg?: FlexProps['direction'];
    xl?: FlexProps['direction'];
  };
  
  /**
   * Responsive wrap
   */
  responsiveWrap?: {
    sm?: FlexProps['wrap'];
    md?: FlexProps['wrap'];
    lg?: FlexProps['wrap'];
    xl?: FlexProps['wrap'];
  };
}

/**
 * Flex component for flexbox layouts with comprehensive control.
 * 
 * @example
 * ```tsx
 * <Flex justify="between" align="center">
 *   <Heading>Title</Heading>
 *   <Button>Action</Button>
 * </Flex>
 * 
 * <Flex direction="col" gap="lg" fullWidth>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </Flex>
 * 
 * <Flex 
 *   wrap="wrap" 
 *   gap="md"
 *   responsiveDirection={{ sm: 'col', lg: 'row' }}
 * >
 *   <FlexItem basis="200px">Sidebar</FlexItem>
 *   <FlexItem grow={1}>Main Content</FlexItem>
 * </Flex>
 * ```
 */
export const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ 
    children, 
    className,
    direction,
    align,
    justify,
    wrap,
    gap,
    grow,
    shrink,
    as: Component = 'div',
    fullWidth = false,
    fullHeight = false,
    basis,
    responsiveDirection,
    responsiveWrap,
    style,
    ...props 
  }, ref) => {
    // Generate responsive direction classes
    const responsiveDirectionClasses = responsiveDirection ? Object.entries(responsiveDirection)
      .map(([breakpoint, dirValue]) => {
        const prefix = breakpoint === 'sm' ? '' : `${breakpoint}:`;
        const dirClass = flexVariants({ direction: dirValue }).split(' ').find(cls => cls.includes('flex-'));
        return `${prefix}${dirClass}`;
      })
      .join(' ') : '';

    // Generate responsive wrap classes
    const responsiveWrapClasses = responsiveWrap ? Object.entries(responsiveWrap)
      .map(([breakpoint, wrapValue]) => {
        const prefix = breakpoint === 'sm' ? '' : `${breakpoint}:`;
        const wrapClass = flexVariants({ wrap: wrapValue }).split(' ').find(cls => cls.includes('flex-'));
        return `${prefix}${wrapClass}`;
      })
      .join(' ') : '';

    const customStyles = basis ? { ...style, flexBasis: basis } : style;

    return (
      <Component
        ref={ref}
        className={cn(
          flexVariants({ 
            direction: responsiveDirection ? 'row' : direction,
            align, 
            justify, 
            wrap: responsiveWrap ? 'nowrap' : wrap, 
            gap, 
            grow, 
            shrink 
          }),
          fullWidth && 'w-full',
          fullHeight && 'h-full',
          responsiveDirectionClasses,
          responsiveWrapClasses,
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

Flex.displayName = 'Flex';

/**
 * Flex item component for explicit flex control
 */
export interface FlexItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Flex grow value
   */
  grow?: 0 | 1;
  
  /**
   * Flex shrink value
   */
  shrink?: 0 | 1;
  
  /**
   * Flex basis value
   */
  basis?: string | 'auto' | 'full';
  
  /**
   * Shorthand flex value
   */
  flex?: string;
  
  /**
   * Align self
   */
  alignSelf?: 'auto' | 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  
  /**
   * Order
   */
  order?: number;
  
  /**
   * Element type to render as
   */
  as?: keyof JSX.IntrinsicElements;
}

const getFlexGrowClass = (grow?: FlexItemProps['grow']) => {
  if (grow === undefined) return '';
  return grow === 0 ? 'flex-grow-0' : 'flex-grow';
};

const getFlexShrinkClass = (shrink?: FlexItemProps['shrink']) => {
  if (shrink === undefined) return '';
  return shrink === 0 ? 'flex-shrink-0' : 'flex-shrink';
};

const getFlexBasisClass = (basis?: FlexItemProps['basis']) => {
  if (!basis || typeof basis !== 'string') return '';
  const basisMap: Record<string, string> = {
    auto: 'basis-auto',
    full: 'basis-full',
  };
  return basisMap[basis] || '';
};

const getAlignSelfClass = (alignSelf?: FlexItemProps['alignSelf']) => {
  if (!alignSelf) return '';
  const alignMap: Record<string, string> = {
    auto: 'self-auto',
    start: 'self-start',
    center: 'self-center',
    end: 'self-end',
    stretch: 'self-stretch',
    baseline: 'self-baseline',
  };
  return alignMap[alignSelf] || '';
};

const getOrderClass = (order?: number) => {
  if (order === undefined) return '';
  if (order >= 1 && order <= 12) return `order-${order}`;
  if (order === 0) return 'order-none';
  return `order-[${order}]`;
};

/**
 * Flex item component for positioned flex children.
 */
export const FlexItem = React.forwardRef<HTMLDivElement, FlexItemProps>(
  ({ 
    children, 
    className,
    grow,
    shrink,
    basis,
    flex,
    alignSelf,
    order,
    as: Component = 'div',
    style,
    ...props 
  }, ref) => {
    const customStyles: React.CSSProperties = { ...style };
    
    if (flex) {
      customStyles.flex = flex;
    } else {
      if (basis && typeof basis === 'string' && !['auto', 'full'].includes(basis)) {
        customStyles.flexBasis = basis;
      }
    }

    return (
      <Component
        ref={ref}
        className={cn(
          getFlexGrowClass(grow),
          getFlexShrinkClass(shrink),
          getFlexBasisClass(basis),
          getAlignSelfClass(alignSelf),
          getOrderClass(order),
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

FlexItem.displayName = 'FlexItem';

/**
 * Preset flex components for common use cases
 */

/**
 * Row - Horizontal flex container
 */
export const Row = React.forwardRef<HTMLDivElement, 
  Omit<FlexProps, 'direction'>
>((props, ref) => (
  <Flex ref={ref} direction="row" {...props} />
));

Row.displayName = 'Row';

/**
 * Column - Vertical flex container
 */
export const Column = React.forwardRef<HTMLDivElement, 
  Omit<FlexProps, 'direction'>
>((props, ref) => (
  <Flex ref={ref} direction="col" {...props} />
));

Column.displayName = 'Column';

/**
 * Center - Centered flex container
 */
export const Center = React.forwardRef<HTMLDivElement, FlexProps>(
  (props, ref) => (
    <Flex 
      ref={ref} 
      justify="center" 
      align="center" 
      fullWidth 
      fullHeight 
      {...props} 
    />
  )
);

Center.displayName = 'Center';

/**
 * Spacer - Flexible space filler
 */
export const Spacer = React.forwardRef<HTMLDivElement, 
  Omit<FlexItemProps, 'grow'>
>((props, ref) => (
  <FlexItem ref={ref} grow={1} {...props} />
));

Spacer.displayName = 'Spacer';