import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

// Enhanced Button Component with ESPN/Yahoo styling
interface EnhancedButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  gradient?: string;
  pulse?: boolean;
}

export function EnhancedButton({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  children,
  onClick,
  className = '',
  gradient = 'from-blue-600 to-purple-600',
  pulse = false
}: EnhancedButtonProps) {
  const baseClasses = 'relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group';
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 focus:ring-gray-500 border border-gray-200',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white focus:ring-blue-500 bg-transparent',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500',
    gradient: `bg-gradient-to-r ${gradient} hover:shadow-lg text-white focus:ring-blue-500 shadow-md hover:shadow-xl`
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm gap-2',
    md: 'px-4 py-3 text-base gap-2',
    lg: 'px-6 py-4 text-lg gap-3',
    xl: 'px-8 py-5 text-xl gap-3'
  };
  
  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${pulse ? 'animate-pulse' : ''}
    ${className}
  `;

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      type="button"
    >
      {/* Gradient overlay for hover effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      
      {/* Content */}
      <div className="relative flex items-center justify-center gap-inherit">
        {loading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {Icon && iconPosition === 'left' && <Icon className="w-5 h-5" />}
            {children}
            {Icon && iconPosition === 'right' && <Icon className="w-5 h-5" />}
          </>
        )}
      </div>
    </motion.button>
  );
}

// Enhanced Card Component
interface EnhancedCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'interactive' | 'gradient';
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  gradient?: string;
}

export function EnhancedCard({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  onClick,
  hoverable = false,
  gradient = 'from-slate-50 to-white'
}: EnhancedCardProps) {
  const baseClasses = 'bg-white rounded-xl transition-all duration-200';
  
  const variantClasses = {
    default: 'border border-gray-200 shadow-sm',
    elevated: 'border border-gray-200 shadow-lg',
    interactive: 'border border-gray-200 shadow-md hover:shadow-lg cursor-pointer',
    gradient: `bg-gradient-to-br ${gradient} border border-gray-100 shadow-md`
  };
  
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${paddingClasses[padding]}
    ${hoverable ? 'hover:shadow-lg cursor-pointer' : ''}
    ${className}
  `;

  return (
    <motion.div
      className={classes}
      onClick={onClick}
      whileHover={hoverable ? { y: -2 } : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

// Enhanced Badge Component
interface EnhancedBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'position';
  size?: 'sm' | 'md' | 'lg';
  position?: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';
  pulse?: boolean;
  icon?: LucideIcon;
  className?: string;
}

export function EnhancedBadge({
  children,
  variant = 'default',
  size = 'md',
  position,
  pulse = false,
  icon: Icon,
  className = ''
}: EnhancedBadgeProps) {
  const baseClasses = 'inline-flex items-center font-semibold rounded-full whitespace-nowrap';
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    position: getPositionColors(position)
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2'
  };
  
  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${pulse ? 'animate-pulse' : ''}
    ${className}
  `;

  return (
    <span className={classes}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </span>
  );
}

function getPositionColors(position?: string) {
  const colors = {
    QB: 'bg-purple-100 text-purple-800',
    RB: 'bg-green-100 text-green-800',
    WR: 'bg-blue-100 text-blue-800',
    TE: 'bg-orange-100 text-orange-800',
    K: 'bg-pink-100 text-pink-800',
    DST: 'bg-gray-100 text-gray-800'
  };
  return position ? colors[position as keyof typeof colors] : 'bg-gray-100 text-gray-800';
}

// Enhanced Stats Display Component
interface StatItemProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon;
  color?: string;
}

export function StatItem({
  label,
  value,
  change,
  trend = 'neutral',
  icon: Icon,
  color = 'text-gray-900'
}: StatItemProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      {Icon && (
        <div className="flex justify-center mb-2">
          <Icon className={`w-8 h-8 ${color}`} />
        </div>
      )}
      <div className={`text-2xl font-bold ${color} mb-1`}>
        {value}
      </div>
      <div className="text-sm text-gray-500 mb-1">
        {label}
      </div>
      {change && (
        <div className={`text-xs font-medium ${trendColors[trend]}`}>
          {change}
        </div>
      )}
    </motion.div>
  );
}

// Enhanced Player Card Component
interface PlayerCardProps {
  player: {
    name: string;
    position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';
    team: string;
    points: number;
    projection?: number;
    status: 'active' | 'injured' | 'bye' | 'questionable';
    avatar?: string;
    trend?: 'up' | 'down' | 'neutral';
  };
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  onClick?: () => void;
}

export function PlayerCard({
  player,
  size = 'md',
  onClick
}: PlayerCardProps) {

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <EnhancedCard
      className={`${sizeClasses[size]} hover:shadow-md cursor-pointer`}
      onClick={onClick}
      hoverable
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {player.avatar || player.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">{player.name}</h3>
              <EnhancedBadge variant="position" position={player.position} size="sm">
                {player.position}
              </EnhancedBadge>
            </div>
            <p className="text-sm text-gray-500">{player.team}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {player.points}
          </div>
          <div className="text-xs text-gray-500">
            {player.projection && `Proj: ${player.projection}`}
          </div>
          <EnhancedBadge
            variant={player.status === 'active' ? 'success' : 
                    player.status === 'injured' ? 'danger' : 'warning'}
            size="sm"
            className="mt-1"
          >
            {player.status}
          </EnhancedBadge>
        </div>
      </div>
    </EnhancedCard>
  );
}

// Enhanced Loading Components
export function LoadingSpinner({ size = 'md', color = 'text-blue-600' }: { size?: 'sm' | 'md' | 'lg', color?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`${sizeClasses[size]} ${color} border-2 border-current border-t-transparent rounded-full animate-spin`} />
  );
}

export function LoadingCard() {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
        <div className="w-16 h-8 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

// Enhanced Input Component
interface EnhancedInputProps {
  label?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export function EnhancedInput({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  error,
  icon: Icon,
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = ''
}: EnhancedInputProps) {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg'
  };

  const baseClasses = `
    w-full bg-white border rounded-lg shadow-sm transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
    ${Icon ? 'pl-10' : ''}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `;

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={baseClasses}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}