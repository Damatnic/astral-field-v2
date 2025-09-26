/**
 * Debounce hooks for performance optimization
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook that debounces a value
 * 
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 * 
 * @example
 * ```ts
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 * useEffect(() => {
 *   if (debouncedSearchTerm) {
 *     searchAPI(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that debounces a callback function
 * 
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @param deps - Dependency array for the callback
 * @returns Debounced callback function
 * 
 * @example
 * ```ts
 * const handleSearch = useDebouncedCallback((query: string) => {
 *   searchAPI(query);
 * }, 500, []);
 * 
 * return <input onChange={(e) => handleSearch(e.target.value)} />;
 * ```
 */
export function useDebouncedCallback<TArgs extends any[]>(
  callback: (...args: TArgs) => void,
  delay: number,
  deps: React.DependencyList = []
): (...args: TArgs) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: TArgs) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, ...deps]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Advanced debounce hook with additional controls
 * 
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @param options - Additional options
 * @returns Object with debounced value and controls
 * 
 * @example
 * ```ts
 * const { debouncedValue, isPending, cancel, flush } = useAdvancedDebounce(
 *   searchTerm,
 *   500,
 *   { maxWait: 1000 }
 * );
 * ```
 */
export function useAdvancedDebounce<T>(
  value: T,
  delay: number,
  options: {
    maxWait?: number;
    leading?: boolean;
    trailing?: boolean;
  } = {}
) {
  const { maxWait, leading = false, trailing = true } = options;
  
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isPending, setIsPending] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCallTimeRef = useRef<number>(0);
  const lastInvokeTimeRef = useRef<number>(0);
  const leadingRef = useRef<boolean>(true);

  const invokeFunc = useCallback(() => {
    const time = Date.now();
    lastInvokeTimeRef.current = time;
    setDebouncedValue(value);
    setIsPending(false);
  }, [value]);

  const leadingEdge = useCallback(() => {
    lastInvokeTimeRef.current = Date.now();
    setIsPending(true);
    
    if (leading) {
      invokeFunc();
    }
  }, [leading, invokeFunc]);

  const trailingEdge = useCallback(() => {
    timeoutRef.current = undefined;
    
    if (trailing && lastCallTimeRef.current !== lastInvokeTimeRef.current) {
      invokeFunc();
    } else {
      setIsPending(false);
    }
  }, [trailing, invokeFunc]);

  const timerExpired = useCallback(() => {
    const time = Date.now();
    
    if (shouldInvoke(time)) {
      trailingEdge();
    } else {
      const remainingWait = Math.max(delay - (time - lastCallTimeRef.current), 0);
      timeoutRef.current = setTimeout(timerExpired, remainingWait);
    }
  }, [delay, trailingEdge]);

  const shouldInvoke = useCallback((time: number) => {
    const timeSinceLastCall = time - lastCallTimeRef.current;
    const timeSinceLastInvoke = time - lastInvokeTimeRef.current;
    
    return (
      leadingRef.current ||
      timeSinceLastCall >= delay ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }, [delay, maxWait]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = undefined;
    }
    
    lastInvokeTimeRef.current = 0;
    leadingRef.current = true;
    setIsPending(false);
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      trailingEdge();
    }
    cancel();
  }, [trailingEdge, cancel]);

  useEffect(() => {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    
    lastCallTimeRef.current = time;

    if (isInvoking) {
      if (!timeoutRef.current) {
        leadingEdge();
      }

      if (maxWait !== undefined) {
        if (!maxTimeoutRef.current) {
          maxTimeoutRef.current = setTimeout(() => {
            if (timeoutRef.current) {
              trailingEdge();
            }
          }, maxWait);
        }
      }
    }

    if (!timeoutRef.current || isInvoking) {
      timeoutRef.current = setTimeout(timerExpired, delay);
    }

    leadingRef.current = false;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, [value, delay, maxWait, leading, trailing, shouldInvoke, leadingEdge, trailingEdge, timerExpired]);

  return {
    debouncedValue,
    isPending,
    cancel,
    flush,
  };
}

/**
 * Hook for debouncing state updates with immediate and delayed values
 * 
 * @param initialValue - Initial value
 * @param delay - Delay in milliseconds
 * @returns State management object
 * 
 * @example
 * ```ts
 * const { value, debouncedValue, setValue, isPending } = useDebouncedState('', 500);
 * 
 * return (
 *   <div>
 *     <input value={value} onChange={(e) => setValue(e.target.value)} />
 *     {isPending && <span>Searching...</span>}
 *     <p>Debounced: {debouncedValue}</p>
 *   </div>
 * );
 * ```
 */
export function useDebouncedState<T>(initialValue: T, delay: number) {
  const [value, setValue] = useState<T>(initialValue);
  const debouncedValue = useDebounce(value, delay);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (value !== debouncedValue) {
      setIsPending(true);
    } else {
      setIsPending(false);
    }
  }, [value, debouncedValue]);

  const handleSetValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(newValue);
  }, []);

  return {
    value,
    debouncedValue,
    setValue: handleSetValue,
    isPending,
  };
}

/**
 * Hook for search input with debounced API calls
 * 
 * @param onSearch - Search callback function
 * @param delay - Delay in milliseconds
 * @param minLength - Minimum query length to trigger search
 * @returns Search utilities
 * 
 * @example
 * ```ts
 * const { query, setQuery, isSearching, results } = useSearch(
 *   async (query) => {
 *     const response = await fetch(`/api/search?q=${query}`);
 *     return response.json();
 *   },
 *   500,
 *   2
 * );
 * ```
 */
export function useSearch<T>(
  onSearch: (query: string) => Promise<T>,
  delay: number = 500,
  minLength: number = 1
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const debouncedQuery = useDebounce(query, delay);

  useEffect(() => {
    if (debouncedQuery.length >= minLength) {
      setIsSearching(true);
      setError(null);
      
      onSearch(debouncedQuery)
        .then((data) => {
          setResults(data);
          setIsSearching(false);
        })
        .catch((err) => {
          setError(err);
          setIsSearching(false);
        });
    } else {
      setResults(null);
      setIsSearching(false);
      setError(null);
    }
  }, [debouncedQuery, onSearch, minLength]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(null);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    error,
    clearSearch,
    hasQuery: query.length >= minLength,
    hasResults: results !== null,
  };
}