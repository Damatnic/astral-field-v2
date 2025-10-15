/**
 * Code component for displaying code snippets and inline code
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/**
 * Code variant styles
 */
const codeVariants = cva(
  'font-mono',
  {
    variants: {
      variant: {
        inline: 'px-1.5 py-0.5 rounded bg-surface-secondary text-text-primary border border-border-subtle text-sm',
        block: 'block p-4 rounded-lg bg-surface-secondary text-text-primary border border-border-primary overflow-x-auto',
        ghost: 'text-text-primary bg-transparent',
      },
      size: {
        xs: 'text-xs',
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
      },
      color: {
        default: '',
        muted: 'text-text-secondary',
        success: 'text-status-success',
        warning: 'text-status-warning',
        error: 'text-status-error',
        info: 'text-status-info',
      },
    },
    defaultVariants: {
      variant: 'inline',
      size: 'sm',
      color: 'default',
    },
  }
);

/**
 * Code component props
 */
type CodeVariantProps = VariantProps<typeof codeVariants>;

export type CodeProps = Omit<React.HTMLAttributes<HTMLElement>, 'color'> & CodeVariantProps & {
  /**
   * Code content
   */
  children: React.ReactNode;
  
  /**
   * HTML element to render as
   * @default 'code'
   */
  as?: 'code' | 'pre' | 'span';
  
  /**
   * Whether to show line numbers (block variant only)
   * @default false
   */
  showLineNumbers?: boolean;
  
  /**
   * Starting line number
   * @default 1
   */
  startLineNumber?: number;
  
  /**
   * Language for syntax highlighting (if supported)
   */
  language?: string;
  
  /**
   * Whether the code is copyable
   * @default false
   */
  copyable?: boolean;
  
  /**
   * Custom copy button label
   * @default 'Copy'
   */
  copyLabel?: string;
  
  /**
   * Callback when code is copied
   */
  onCopy?: (code: string) => void;
  
  /**
   * Whether to wrap long lines
   * @default false
   */
  wrap?: boolean;
}

/**
 * Code component for displaying inline code and code blocks.
 * 
 * @example
 * ```tsx
 * <Text>
 *   Use the <Code>useState</Code> hook for state management.
 * </Text>
 * 
 * <Code variant="block" language="javascript" copyable>
 *   {`function greet(name) {
 *   return \`Hello, \${name}!\`;
 * }`}
 * </Code>
 * 
 * <Code variant="block" showLineNumbers startLineNumber={5}>
 *   {`console.log('Line 5');
 * console.log('Line 6');
 * console.log('Line 7');`}
 * </Code>
 * ```
 */
export const Code = React.forwardRef<HTMLElement, CodeProps>(
  ({ 
    children, 
    className,
    variant,
    size,
    color,
    as,
    showLineNumbers = false,
    startLineNumber = 1,
    language,
    copyable = false,
    copyLabel = 'Copy',
    onCopy,
    wrap = false,
    ...props 
  }, ref) => {
    const [copied, setCopied] = React.useState(false);
    
    // Determine the HTML element
    const Component = as || (variant === 'block' ? 'pre' : 'code');
    
    // Handle copy functionality
    const handleCopy = async () => {
      if (!copyable) return;
      
      const codeText = typeof children === 'string' ? children : '';
      
      try {
        await navigator.clipboard.writeText(codeText);
        setCopied(true);
        onCopy?.(codeText);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    };

    // Generate line numbers if needed
    const renderWithLineNumbers = () => {
      if (!showLineNumbers || typeof children !== 'string') {
        return children;
      }

      const lines = children.split('\n');
      return lines.map((line, index) => (
        <div key={index} className="flex">
          <span className="select-none text-text-tertiary pr-4 text-right min-w-[3rem]">
            {startLineNumber + index}
          </span>
          <span className="flex-1">{line || ' '}</span>
        </div>
      ));
    };

    if (variant === 'block') {
      return (
        <div className="relative group">
          <Component
            ref={ref as any}
            className={cn(
              codeVariants({ variant, size, color: color as any }),
              wrap ? 'whitespace-pre-wrap' : 'whitespace-pre',
              language && `language-${language}`,
              className
            )}
            {...props}
          >
            {showLineNumbers ? (
              <code>{renderWithLineNumbers()}</code>
            ) : (
              children
            )}
          </Component>
          
          {copyable && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 px-2 py-1 text-xs bg-surface-elevated border border-border-primary rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-secondary"
              aria-label={copyLabel}
            >
              {copied ? 'Copied!' : copyLabel}
            </button>
          )}
        </div>
      );
    }

    return (
      <Component
        ref={ref as any}
        className={cn(codeVariants({ variant, size, color: color as any }), className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Code.displayName = 'Code';

/**
 * Inline Code - Shorthand for inline code
 */
export const InlineCode = React.forwardRef<HTMLElement, 
  Omit<CodeProps, 'variant'>
>((props, ref) => (
  <Code ref={ref} variant="inline" {...props} />
));

InlineCode.displayName = 'InlineCode';

/**
 * Code Block - Shorthand for block code
 */
export const CodeBlock = React.forwardRef<HTMLElement, 
  Omit<CodeProps, 'variant'>
>((props, ref) => (
  <Code ref={ref} variant="block" {...props} />
));

CodeBlock.displayName = 'CodeBlock';

/**
 * Keyboard Key - Styled keyboard key representation
 */
export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Key content
   */
  children: React.ReactNode;
  
  /**
   * Size of the key
   */
  size?: 'sm' | 'md' | 'lg';
}

const kbdVariants = cva(
  'inline-flex items-center justify-center font-mono font-medium border border-border-primary bg-surface-elevated text-text-primary rounded shadow-sm',
  {
    variants: {
      size: {
        sm: 'px-1.5 py-0.5 text-xs min-w-[1.5rem] h-6',
        md: 'px-2 py-1 text-sm min-w-[2rem] h-7',
        lg: 'px-2.5 py-1.5 text-base min-w-[2.5rem] h-8',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

/**
 * Keyboard key component for displaying keyboard shortcuts.
 * 
 * @example
 * ```tsx
 * <Text>
 *   Press <Kbd>Ctrl</Kbd> + <Kbd>S</Kbd> to save.
 * </Text>
 * 
 * <Text>
 *   Use <Kbd>↑</Kbd> <Kbd>↓</Kbd> arrow keys to navigate.
 * </Text>
 * ```
 */
export const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ children, className, size = 'md', ...props }, ref) => {
    return (
      <kbd
        ref={ref as any}
        className={cn(kbdVariants({ size }), className)}
        {...props}
      >
        {children}
      </kbd>
    );
  }
);

Kbd.displayName = 'Kbd';

/**
 * Syntax highlighting component (placeholder for future enhancement)
 */
export interface SyntaxHighlighterProps extends Omit<CodeProps, 'variant'> {
  /**
   * Theme for syntax highlighting
   */
  theme?: 'light' | 'dark' | 'auto';
  
  /**
   * Custom highlight lines
   */
  highlightLines?: number[];
}

/**
 * Syntax Highlighter - Enhanced code block with syntax highlighting.
 * Note: This is a placeholder implementation. In production, you would
 * integrate with libraries like Prism.js or highlight.js.
 */
export const SyntaxHighlighter = React.forwardRef<HTMLElement, SyntaxHighlighterProps>(
  ({ 
    highlightLines = [], 
    theme = 'auto', 
    className,
    children,
    ...props 
  }, ref) => {
    // This would integrate with a syntax highlighting library
    // For now, it's a styled code block
    return (
      <CodeBlock
        ref={ref}
        className={cn(
          'syntax-highlighter',
          theme === 'dark' && 'bg-neutral-900 text-neutral-100',
          theme === 'light' && 'bg-neutral-50 text-neutral-900',
          className
        )}
        {...props}
      >
        {children}
      </CodeBlock>
    );
  }
);

SyntaxHighlighter.displayName = 'SyntaxHighlighter';