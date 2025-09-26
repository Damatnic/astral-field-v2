/**
 * Utility for merging Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with proper Tailwind CSS conflict resolution
 * 
 * @param inputs - Array of class names, objects, or conditional values
 * @returns Merged and deduplicated class string
 * 
 * @example
 * ```ts
 * cn('px-2 py-1', 'px-4') // 'py-1 px-4'
 * cn('bg-red-500', { 'bg-blue-500': true }) // 'bg-blue-500'
 * cn('text-sm', condition && 'text-lg') // 'text-sm' or 'text-lg'
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Export alias for shorter usage
export { cn as cx };

/**
 * Create a className merger with preset base classes
 * Useful for component variants where you want to merge with base styles
 * 
 * @param baseClasses - Base classes to always include
 * @returns Function that merges additional classes with base classes
 * 
 * @example
 * ```ts
 * const buttonClasses = createClassMerger('inline-flex items-center justify-center rounded-md');
 * buttonClasses('px-4 py-2', { 'bg-primary': isPrimary }); // includes base + additional classes
 * ```
 */
export function createClassMerger(baseClasses: string) {
  return (...inputs: ClassValue[]) => cn(baseClasses, ...inputs);
}