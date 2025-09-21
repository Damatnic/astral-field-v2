import React from 'react';
import { cn } from '@/lib/utils';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'success';
}

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantStyles = {
      default: 'bg-background text-foreground border-border',
      destructive: 'border-red-500/50 text-red-600 dark:border-red-500/50 dark:text-red-400 bg-red-50 dark:bg-red-900/10',
      warning: 'border-yellow-500/50 text-yellow-600 dark:border-yellow-500/50 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10',
      success: 'border-green-500/50 text-green-600 dark:border-green-500/50 dark:text-green-400 bg-green-50 dark:bg-green-900/10'
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);

const AlertTitle = React.forwardRef<HTMLParagraphElement, AlertTitleProps>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  )
);

const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-sm [&_p]:leading-relaxed', className)}
      {...props}
    />
  )
);

Alert.displayName = 'Alert';
AlertTitle.displayName = 'AlertTitle';
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
export type { AlertProps, AlertTitleProps, AlertDescriptionProps };