/**
 * useDebounce hook
 * 
 * A custom hook that delays updating a value until a specified delay has passed
 * since the last change. Useful for search inputs to prevent excessive API calls.
 */
import { useState, useEffect } from 'react';

/**
 * Returns a debounced value that only updates after the specified delay
 * 
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if the value changes before the delay period
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
