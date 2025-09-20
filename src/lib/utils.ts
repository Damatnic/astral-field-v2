import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.substring(0, length) + '...' : str;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function executedFunction(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Safe number formatting utilities to prevent toFixed() errors
export function safeToFixed(value: any, decimals: number = 1): string {
  // Handle null, undefined, or empty values
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  
  // Convert to number and check if valid
  const num = typeof value === 'number' ? value : Number(value);
  
  // Handle NaN or invalid conversions
  if (isNaN(num)) {
    return '0';
  }
  
  // Return formatted number
  return num.toFixed(decimals);
}

export function safeNumber(value: any, defaultValue: number = 0): number {
  // Handle null, undefined, or empty values
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  // Convert to number
  const num = typeof value === 'number' ? value : Number(value);
  
  // Return default if NaN
  return isNaN(num) ? defaultValue : num;
}