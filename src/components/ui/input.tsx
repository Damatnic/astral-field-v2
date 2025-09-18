import React, { forwardRef } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'underlined';
  inputSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  success,
  hint,
  leftIcon,
  rightIcon,
  variant = 'default',
  inputSize = 'md',
  fullWidth = false,
  showPasswordToggle = false,
  className = '',
  type = 'text',
  disabled = false,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [internalType, setInternalType] = React.useState(type);

  React.useEffect(() => {
    if (type === 'password' && showPasswordToggle) {
      setInternalType(showPassword ? 'text' : 'password');
    }
  }, [showPassword, type, showPasswordToggle]);

  const baseClasses = [
    'transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-offset-1',
    'placeholder:text-gray-400 dark:placeholder:text-gray-500',
    disabled && 'opacity-60 cursor-not-allowed',
    fullWidth && 'w-full'
  ].filter(Boolean).join(' ');

  const variantClasses = {
    default: [
      'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600',
      'focus:border-primary-500 focus:ring-primary-500',
      error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500',
      success && 'border-success-500 focus:border-success-500 focus:ring-success-500'
    ].filter(Boolean).join(' '),
    filled: [
      'bg-gray-50 dark:bg-gray-800 border-transparent',
      'focus:bg-white dark:focus:bg-gray-900 focus:border-primary-500 focus:ring-primary-500',
      error && 'bg-danger-50 dark:bg-danger-900/20 border-danger-500 focus:border-danger-500 focus:ring-danger-500',
      success && 'bg-success-50 dark:bg-success-900/20 border-success-500 focus:border-success-500 focus:ring-success-500'
    ].filter(Boolean).join(' '),
    underlined: [
      'bg-transparent border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none',
      'focus:border-primary-500 focus:ring-0 focus:ring-offset-0',
      error && 'border-danger-500 focus:border-danger-500',
      success && 'border-success-500 focus:border-success-500'
    ].filter(Boolean).join(' ')
  };

  const sizeClasses = {
    sm: variant === 'underlined' ? 'h-8 px-0 text-sm' : 'h-8 px-3 text-sm rounded-md',
    md: variant === 'underlined' ? 'h-10 px-0 text-base' : 'h-10 px-4 text-base rounded-lg',
    lg: variant === 'underlined' ? 'h-12 px-0 text-lg' : 'h-12 px-5 text-lg rounded-lg'
  };

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }[inputSize];

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {props.required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <span className={iconSize}>{leftIcon}</span>
          </div>
        )}
        
        <input
          ref={ref}
          type={internalType}
          className={`
            ${baseClasses}
            ${variantClasses[variant]}
            ${sizeClasses[inputSize]}
            ${leftIcon ? 'pl-10' : ''}
            ${(rightIcon || showPasswordToggle || error || success) ? 'pr-10' : ''}
            ${className}
          `}
          disabled={disabled}
          {...props}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={disabled}
            >
              {showPassword ? (
                <EyeOff className={iconSize} />
              ) : (
                <Eye className={iconSize} />
              )}
            </button>
          )}
          
          {error && (
            <AlertCircle className={`${iconSize} text-danger-500`} />
          )}
          
          {success && !error && (
            <CheckCircle className={`${iconSize} text-success-500`} />
          )}
          
          {rightIcon && !showPasswordToggle && !error && !success && (
            <span className={`${iconSize} text-gray-400`}>{rightIcon}</span>
          )}
        </div>
      </div>
      
      {(error || success || hint) && (
        <div className="mt-1 text-sm">
          {error && (
            <p className="text-danger-600 dark:text-danger-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
          {success && !error && (
            <p className="text-success-600 dark:text-success-400 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {success}
            </p>
          )}
          {hint && !error && !success && (
            <p className="text-gray-500 dark:text-gray-400">{hint}</p>
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';