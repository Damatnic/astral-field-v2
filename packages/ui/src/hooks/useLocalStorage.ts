/**
 * Local storage hook with type safety and SSR support
 */

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';

/**
 * Type for the return value of useLocalStorage
 */
type UseLocalStorageReturn<T> = [
  T,
  Dispatch<SetStateAction<T>>,
  {
    remove: () => void;
    reset: () => void;
  }
];

/**
 * Hook for managing state in localStorage with type safety
 * 
 * @param key - localStorage key
 * @param initialValue - Initial value or function that returns initial value
 * @param options - Additional options
 * @returns Tuple of [value, setValue, { remove, reset }]
 * 
 * @example
 * ```ts
 * const [user, setUser, { remove, reset }] = useLocalStorage('user', null);
 * const [settings, setSettings] = useLocalStorage('settings', { theme: 'light' });
 * const [count, setCount] = useLocalStorage('count', () => 0);
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    onError?: (error: Error) => void;
  } = {}
): UseLocalStorageReturn<T> {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    onError,
  } = options;

  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return typeof initialValue === 'function' 
        ? (initialValue as () => T)() 
        : initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return typeof initialValue === 'function' 
          ? (initialValue as () => T)() 
          : initialValue;
      }
      return deserialize(item);
    } catch (error) {
      onError?.(error as Error);
      return typeof initialValue === 'function' 
        ? (initialValue as () => T)() 
        : initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (value) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        // Save state
        setStoredValue(valueToStore);
        
        // Save to localStorage
        if (typeof window !== 'undefined') {
          if (valueToStore === undefined) {
            window.localStorage.removeItem(key);
          } else {
            window.localStorage.setItem(key, serialize(valueToStore));
          }
        }
      } catch (error) {
        onError?.(error as Error);
      }
    },
    [key, serialize, storedValue, onError]
  );

  // Remove the item from localStorage
  const remove = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      setStoredValue(
        typeof initialValue === 'function' 
          ? (initialValue as () => T)() 
          : initialValue
      );
    } catch (error) {
      onError?.(error as Error);
    }
  }, [key, initialValue, onError]);

  // Reset to initial value
  const reset = useCallback(() => {
    const resetValue = typeof initialValue === 'function' 
      ? (initialValue as () => T)() 
      : initialValue;
    setValue(resetValue);
  }, [initialValue, setValue]);

  // Listen for changes in other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(deserialize(e.newValue));
        } catch (error) {
          onError?.(error as Error);
        }
      }
      if (e.key === key && e.newValue === null) {
        setStoredValue(
          typeof initialValue === 'function' 
            ? (initialValue as () => T)() 
            : initialValue
        );
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserialize, initialValue, onError]);

  return [storedValue, setValue, { remove, reset }];
}

/**
 * Hook for managing boolean flags in localStorage
 * 
 * @param key - localStorage key
 * @param initialValue - Initial boolean value
 * @returns Tuple of [value, setValue, toggle, { remove, reset }]
 * 
 * @example
 * ```ts
 * const [isDarkMode, setIsDarkMode, toggleDarkMode] = useLocalStorageBoolean('darkMode', false);
 * ```
 */
export function useLocalStorageBoolean(
  key: string,
  initialValue: boolean = false
): [
  boolean,
  Dispatch<SetStateAction<boolean>>,
  () => void,
  { remove: () => void; reset: () => void }
] {
  const [value, setValue, { remove, reset }] = useLocalStorage(key, initialValue);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, [setValue]);

  return [value, setValue, toggle, { remove, reset }];
}

/**
 * Hook for managing arrays in localStorage
 * 
 * @param key - localStorage key
 * @param initialValue - Initial array value
 * @returns Array utilities
 * 
 * @example
 * ```ts
 * const { items, push, remove, clear, set } = useLocalStorageArray('favorites', []);
 * push('new-item');
 * remove(0);
 * clear();
 * ```
 */
export function useLocalStorageArray<T>(
  key: string,
  initialValue: T[] = []
) {
  const [items, setItems, { remove: removeStorage, reset }] = useLocalStorage(key, initialValue);

  const push = useCallback((item: T) => {
    setItems(prev => [...prev, item]);
  }, [setItems]);

  const removeAt = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, [setItems]);

  const removeItem = useCallback((item: T) => {
    setItems(prev => prev.filter(i => i !== item));
  }, [setItems]);

  const update = useCallback((index: number, item: T) => {
    setItems(prev => prev.map((existingItem, i) => i === index ? item : existingItem));
  }, [setItems]);

  const clear = useCallback(() => {
    setItems([]);
  }, [setItems]);

  const has = useCallback((item: T) => {
    return items.includes(item);
  }, [items]);

  return {
    items,
    set: setItems,
    push,
    removeAt,
    removeItem,
    update,
    clear,
    has,
    length: items.length,
    isEmpty: items.length === 0,
    remove: removeStorage,
    reset,
  };
}

/**
 * Hook for managing objects in localStorage with type safety
 * 
 * @param key - localStorage key
 * @param initialValue - Initial object value
 * @returns Object utilities
 * 
 * @example
 * ```ts
 * const { data, update, reset } = useLocalStorageObject('userPrefs', {
 *   theme: 'light',
 *   notifications: true,
 * });
 * update({ theme: 'dark' });
 * ```
 */
export function useLocalStorageObject<T extends Record<string, any>>(
  key: string,
  initialValue: T
) {
  const [data, setData, { remove, reset }] = useLocalStorage(key, initialValue);

  const update = useCallback((updates: Partial<T>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, [setData]);

  const updateKey = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, [setData]);

  const removeKey = useCallback((key: keyof T) => {
    setData(prev => {
      const newData = { ...prev };
      delete newData[key];
      return newData;
    });
  }, [setData]);

  return {
    data,
    set: setData,
    update,
    updateKey,
    removeKey,
    remove,
    reset,
  };
}