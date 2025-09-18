import React, { createContext, useContext, useState } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
  variant: 'default' | 'pills' | 'underline';
  size: 'sm' | 'md' | 'lg';
}

const TabsContext = createContext<TabsContextType | null>(null);

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab components must be used within a Tabs provider');
  }
  return context;
};

interface TabsProps {
  children: React.ReactNode;
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  badge?: string | number;
}

interface TabsContentProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export function Tabs({
  children,
  defaultValue,
  value,
  onValueChange,
  variant = 'default',
  size = 'md',
  className = ''
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  
  const activeTab = value ?? internalValue;
  
  const setActiveTab = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant, size }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }: TabsListProps) {
  const { variant } = useTabs();
  
  const baseClasses = 'flex';
  
  const variantClasses = {
    default: 'bg-gray-100 dark:bg-gray-800 p-1 rounded-lg',
    pills: 'gap-1',
    underline: 'border-b border-gray-200 dark:border-gray-700'
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({
  children,
  value,
  disabled = false,
  className = '',
  leftIcon,
  rightIcon,
  badge
}: TabsTriggerProps) {
  const { activeTab, setActiveTab, variant, size } = useTabs();
  const isActive = activeTab === value;

  const baseClasses = [
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    !disabled && 'cursor-pointer'
  ].filter(Boolean).join(' ');

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const variantClasses = {
    default: isActive
      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm rounded-md'
      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md',
    pills: isActive
      ? 'bg-primary-600 text-white rounded-lg shadow-sm'
      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg',
    underline: isActive
      ? 'text-primary-600 border-b-2 border-primary-600 -mb-px'
      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 -mb-px'
  };

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }[size];

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      onClick={() => !disabled && setActiveTab(value)}
      disabled={disabled}
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      id={`tab-${value}`}
    >
      {leftIcon && (
        <span className={iconSize}>{leftIcon}</span>
      )}
      <span>{children}</span>
      {badge !== undefined && (
        <span className={`
          inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 
          text-xs font-medium rounded-full
          ${isActive 
            ? 'bg-primary-100 text-primary-800' 
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }
        `}>
          {badge}
        </span>
      )}
      {rightIcon && (
        <span className={iconSize}>{rightIcon}</span>
      )}
    </button>
  );
}

export function TabsContent({ children, value, className = '' }: TabsContentProps) {
  const { activeTab } = useTabs();
  
  if (activeTab !== value) return null;

  return (
    <div
      className={`mt-4 focus:outline-none animate-fade-in ${className}`}
      role="tabpanel"
      aria-labelledby={`tab-${value}`}
      id={`tabpanel-${value}`}
    >
      {children}
    </div>
  );
}