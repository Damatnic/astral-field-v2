/**
 * Quote component for displaying quotes and testimonials
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/**
 * Quote variant styles
 */
const quoteVariants = cva(
  'relative',
  {
    variants: {
      variant: {
        default: 'border-l-4 border-border-primary pl-6 italic',
        card: 'bg-surface-secondary border border-border-primary rounded-lg p-6',
        centered: 'text-center max-w-2xl mx-auto',
        testimonial: 'bg-surface-elevated border border-border-subtle rounded-xl p-8 shadow-card',
      },
      size: {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
      },
      color: {
        default: 'text-text-primary',
        muted: 'text-text-secondary',
        accent: 'border-interactive-primary',
        success: 'border-status-success',
        warning: 'border-status-warning',
        error: 'border-status-error',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      color: 'default',
    },
  }
);

/**
 * Quote component props
 */
export interface QuoteProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof quoteVariants> {
  /**
   * Quote content
   */
  children: React.ReactNode;
  
  /**
   * Author of the quote
   */
  author?: string;
  
  /**
   * Author's title or role
   */
  authorTitle?: string;
  
  /**
   * Citation or source
   */
  cite?: string;
  
  /**
   * Avatar/image URL for the author
   */
  avatar?: string;
  
  /**
   * Show decorative quote marks
   * @default false
   */
  showQuoteMarks?: boolean;
  
  /**
   * HTML element to render as
   * @default 'blockquote'
   */
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Quote component for displaying blockquotes, testimonials, and citations.
 * 
 * @example
 * ```tsx
 * <Quote author="Albert Einstein">
 *   Imagination is more important than knowledge.
 * </Quote>
 * 
 * <Quote 
 *   variant="testimonial" 
 *   author="John Doe" 
 *   authorTitle="CEO, Company Inc"
 *   avatar="/avatars/john.jpg"
 *   showQuoteMarks
 * >
 *   This product has completely transformed our workflow. 
 *   I can't imagine working without it now.
 * </Quote>
 * 
 * <Quote variant="centered" size="lg" color="accent">
 *   The only way to do great work is to love what you do.
 * </Quote>
 * ```
 */
export const Quote = React.forwardRef<HTMLElement, QuoteProps>(
  ({ 
    children, 
    className,
    variant,
    size,
    color,
    author,
    authorTitle,
    cite,
    avatar,
    showQuoteMarks = false,
    as: Component = 'blockquote',
    ...props 
  }, ref) => {
    const hasAuthorInfo = author || authorTitle || avatar;
    
    return (
      <Component
        ref={ref as any}
        className={cn(quoteVariants({ variant, size, color }), className)}
        cite={cite}
        {...props}
      >
        {/* Quote marks */}
        {showQuoteMarks && (
          <span 
            className="absolute -top-2 -left-2 text-4xl text-text-tertiary leading-none select-none"
            aria-hidden="true"
          >
            "
          </span>
        )}
        
        {/* Quote content */}
        <div className={cn(
          'leading-relaxed',
          variant === 'testimonial' && 'mb-6',
          hasAuthorInfo && variant === 'default' && 'mb-4'
        )}>
          {children}
        </div>
        
        {/* Author information */}
        {hasAuthorInfo && (
          <footer className={cn(
            'flex items-center gap-3',
            variant === 'centered' && 'justify-center',
            variant === 'default' && 'text-text-secondary text-sm not-italic',
            variant === 'testimonial' && 'border-t border-border-subtle pt-6'
          )}>
            {avatar && (
              <img
                src={avatar}
                alt={author || 'Author'}
                className="w-10 h-10 rounded-full object-cover border-2 border-border-subtle"
              />
            )}
            
            <div className={cn(
              'flex flex-col',
              variant === 'centered' && 'items-center'
            )}>
              {author && (
                <cite className={cn(
                  'not-italic font-medium',
                  variant === 'default' ? 'text-text-secondary' : 'text-text-primary'
                )}>
                  {author}
                </cite>
              )}
              
              {authorTitle && (
                <span className="text-text-tertiary text-sm">
                  {authorTitle}
                </span>
              )}
            </div>
          </footer>
        )}
        
        {/* Closing quote mark */}
        {showQuoteMarks && (
          <span 
            className="absolute -bottom-2 -right-2 text-4xl text-text-tertiary leading-none select-none"
            aria-hidden="true"
          >
            "
          </span>
        )}
      </Component>
    );
  }
);

Quote.displayName = 'Quote';

/**
 * Blockquote - Standard blockquote
 */
export const Blockquote = React.forwardRef<HTMLElement, 
  Omit<QuoteProps, 'variant'>
>((props, ref) => (
  <Quote ref={ref} variant="default" {...props} />
));

Blockquote.displayName = 'Blockquote';

/**
 * Testimonial - Card-style testimonial
 */
export const Testimonial = React.forwardRef<HTMLElement, 
  Omit<QuoteProps, 'variant'>
>((props, ref) => (
  <Quote ref={ref} variant="testimonial" showQuoteMarks {...props} />
));

Testimonial.displayName = 'Testimonial';

/**
 * Pull Quote - Centered decorative quote
 */
export const PullQuote = React.forwardRef<HTMLElement, 
  Omit<QuoteProps, 'variant' | 'size'>
>((props, ref) => (
  <Quote ref={ref} variant="centered" size="lg" showQuoteMarks {...props} />
));

PullQuote.displayName = 'PullQuote';

/**
 * Fantasy Quote - Quote styled for fantasy sports content
 */
export const FantasyQuote = React.forwardRef<HTMLElement, 
  Omit<QuoteProps, 'variant' | 'color'>
>(({ className, ...props }, ref) => (
  <Quote 
    ref={ref} 
    variant="card" 
    color="accent"
    className={cn('bg-gradient-to-r from-surface-secondary to-surface-elevated', className)}
    {...props} 
  />
));

FantasyQuote.displayName = 'FantasyQuote';

/**
 * Inline Quote - Small inline quote
 */
export interface InlineQuoteProps extends Omit<QuoteProps, 'variant' | 'as'> {
  /**
   * HTML element to render as
   */
  as?: 'q' | 'span';
}

/**
 * Inline quote component for short quotes within text.
 */
export const InlineQuote = React.forwardRef<HTMLElement, InlineQuoteProps>(
  ({ 
    children, 
    className,
    as: Component = 'q',
    cite,
    ...props 
  }, ref) => {
    return (
      <Component
        ref={ref as any}
        className={cn(
          'italic text-text-primary',
          'before:content-[open-quote] after:content-[close-quote]',
          'before:text-text-tertiary after:text-text-tertiary',
          className
        )}
        cite={cite}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

InlineQuote.displayName = 'InlineQuote';