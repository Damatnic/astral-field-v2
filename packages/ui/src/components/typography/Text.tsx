/**
 * Text component for consistent body text styling
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/**
 * Text variant styles
 */
const textVariants = cva(
  'text-text-primary',
  {
    variants: {
      size: {
        '2xl': 'text-2xl leading-relaxed',
        xl: 'text-xl leading-relaxed',
        lg: 'text-lg leading-relaxed',
        md: 'text-base leading-relaxed',
        sm: 'text-sm leading-normal',
        xs: 'text-xs leading-normal',
      },
      variant: {
        default: 'text-text-primary',
        secondary: 'text-text-secondary',
        muted: 'text-text-tertiary',
        inverse: 'text-text-inverse',
        disabled: 'text-text-disabled',
        link: 'text-text-link hover:text-text-link-hover underline-offset-4 hover:underline cursor-pointer',
        destructive: 'text-status-error',
        success: 'text-status-success',
        warning: 'text-status-warning',
        info: 'text-status-info',
      },
      weight: {
        thin: 'font-thin',
        extralight: 'font-extralight',
        light: 'font-light',
        normal: 'font-normal',
        medium: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold',
        extrabold: 'font-extrabold',
        black: 'font-black',
      },
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
        justify: 'text-justify',
      },
      decoration: {
        none: 'no-underline',
        underline: 'underline',
        overline: 'overline',
        'line-through': 'line-through',
      },
      transform: {
        none: 'normal-case',
        uppercase: 'uppercase',
        lowercase: 'lowercase',
        capitalize: 'capitalize',
      },
      truncate: {
        true: 'truncate',
        false: '',
      },
      wrap: {
        wrap: 'break-words',
        nowrap: 'whitespace-nowrap',
        pre: 'whitespace-pre',
        'pre-line': 'whitespace-pre-line',
        'pre-wrap': 'whitespace-pre-wrap',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
      weight: 'normal',
      align: 'left',
      decoration: 'none',
      transform: 'none',
      truncate: false,
      wrap: 'wrap',
    },
  }
);

/**
 * Text component props
 */
export interface TextProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof textVariants> {
  /**
   * HTML element to render as
   * @default 'p'
   */
  as?: keyof JSX.IntrinsicElements;
  
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
  
  /**
   * Maximum number of lines before truncating
   */
  lineClamp?: number;
  
  /**
   * Whether the text content is selectable
   * @default true
   */
  selectable?: boolean;
}

/**
 * Text component for consistent body text and content.
 * 
 * @example
 * ```tsx
 * <Text>
 *   Regular paragraph text with default styling.
 * </Text>
 * 
 * <Text size="lg" weight="medium" variant="secondary">
 *   Larger secondary text with medium weight.
 * </Text>
 * 
 * <Text as="span" variant="link" onClick={() => navigate('/help')}>
 *   Clickable link text
 * </Text>
 * 
 * <Text gradient gradientFrom="blue-500" gradientTo="purple-600">
 *   Beautiful gradient text
 * </Text>
 * 
 * <Text lineClamp={3}>
 *   This is a long text that will be clamped to 3 lines with an ellipsis
 *   at the end if it exceeds the specified number of lines.
 * </Text>
 * ```
 */
export const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ 
    children, 
    className,
    size,
    variant,
    weight,
    align,
    decoration,
    transform,
    truncate,
    wrap,
    as: Component = 'p',
    gradient = false,
    gradientFrom = 'blue-500',
    gradientTo = 'purple-600',
    balance = false,
    lineClamp,
    selectable = true,
    style,
    ...props 
  }, ref) => {
    const gradientClasses = gradient 
      ? `bg-gradient-to-r from-${gradientFrom} to-${gradientTo} bg-clip-text text-transparent`
      : '';

    const lineClampClasses = lineClamp 
      ? `line-clamp-${lineClamp}` 
      : '';

    const balanceStyles = balance ? { textWrap: 'balance' as any } : {};
    const selectableStyles = !selectable ? { userSelect: 'none' as any } : {};

    return (
      <Component
        ref={ref as any}
        className={cn(
          textVariants({ 
            size, 
            variant: gradient ? 'default' : variant, 
            weight, 
            align, 
            decoration, 
            transform, 
            truncate: lineClamp ? false : truncate, 
            wrap 
          }),
          gradientClasses,
          lineClampClasses,
          !selectable && 'select-none',
          className
        )}
        style={{ ...balanceStyles, ...selectableStyles, ...style }}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Text.displayName = 'Text';

/**
 * Lead Text - Larger introductory text
 */
export const Lead = React.forwardRef<HTMLParagraphElement, 
  Omit<TextProps, 'size' | 'as'>
>((props, ref) => (
  <Text ref={ref as any} as="p" size="xl" balance {...props} />
));

Lead.displayName = 'Lead';

/**
 * Small Text - Smaller secondary text
 */
export const Small = React.forwardRef<HTMLElement, 
  Omit<TextProps, 'size'>
>((props, ref) => (
  <Text ref={ref} size="sm" variant="secondary" {...props} />
));

Small.displayName = 'Small';

/**
 * Muted Text - De-emphasized text
 */
export const Muted = React.forwardRef<HTMLElement, 
  Omit<TextProps, 'variant'>
>((props, ref) => (
  <Text ref={ref} variant="muted" {...props} />
));

Muted.displayName = 'Muted';

/**
 * Label Text - Form labels and captions
 */
export const Label = React.forwardRef<HTMLLabelElement, 
  Omit<TextProps, 'as' | 'size' | 'weight'>
>(({ className, ...props }, ref) => (
  <Text 
    ref={ref as any} 
    as="label" 
    size="sm" 
    weight="medium"
    className={cn('leading-normal', className)}
    {...props} 
  />
));

Label.displayName = 'Label';

/**
 * Caption Text - Very small descriptive text
 */
export const Caption = React.forwardRef<HTMLElement, 
  Omit<TextProps, 'size' | 'variant'>
>((props, ref) => (
  <Text ref={ref} size="xs" variant="muted" {...props} />
));

Caption.displayName = 'Caption';

/**
 * Link Text - Styled link text
 */
export const Link = React.forwardRef<HTMLAnchorElement, 
  Omit<TextProps, 'variant' | 'as'>
>((props, ref) => (
  <Text ref={ref as any} as="a" variant="link" {...props} />
));

Link.displayName = 'Link';

/**
 * Fantasy-specific text components
 */

/**
 * Player Name - Styled player name text
 */
export const PlayerName = React.forwardRef<HTMLElement, 
  Omit<TextProps, 'weight'>
>((props, ref) => (
  <Text ref={ref} weight="medium" {...props} />
));

PlayerName.displayName = 'PlayerName';

/**
 * Team Name - Styled team name text
 */
export const TeamName = React.forwardRef<HTMLElement, 
  Omit<TextProps, 'weight' | 'size'>
>((props, ref) => (
  <Text ref={ref} size="lg" weight="semibold" {...props} />
));

TeamName.displayName = 'TeamName';

/**
 * Position Label - Player position text
 */
export const PositionLabel = React.forwardRef<HTMLElement, 
  Omit<TextProps, 'size' | 'weight' | 'transform'>
>(({ className, ...props }, ref) => (
  <Text 
    ref={ref} 
    size="xs" 
    weight="bold" 
    transform="uppercase"
    className={cn('tracking-widest', className)}
    {...props} 
  />
));

PositionLabel.displayName = 'PositionLabel';

/**
 * Fantasy Points - Styled fantasy points display
 */
export const FantasyPoints = React.forwardRef<HTMLElement, 
  Omit<TextProps, 'weight' | 'size'>
>((props, ref) => (
  <Text ref={ref} size="xl" weight="bold" {...props} />
));

FantasyPoints.displayName = 'FantasyPoints';

/**
 * Projection Text - Fantasy projection text
 */
export const ProjectionText = React.forwardRef<HTMLElement, 
  Omit<TextProps, 'as' | 'size' | 'weight'>
>(({ className, ...props }, ref) => (
  <Text 
    ref={ref} 
    as="span" 
    size="sm" 
    weight="medium"
    className={cn('font-mono', className)}
    {...props} 
  />
));

ProjectionText.displayName = 'ProjectionText';