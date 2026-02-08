import { isString } from "lodash";
import { useCallback, useState } from "react";

export default function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  function isServerSide() {
    return typeof window === "undefined";
  }

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (isServerSide()) {
        return initialValue;
      }
      const item = window.localStorage.getItem(key);

      if (!item && initialValue !== null) {
        window.localStorage.setItem(key, JSON.stringify(initialValue));
      }

      try {
        return item ? JSON.parse(item) : initialValue;
      } catch {
        // Some legacy items are stored as raw strings instead of JSON strings.
        // Restore it as a JSON string and return it.
        if (isString(item)) {
          window.localStorage.setItem(key, JSON.stringify(item));
          return item;
        }
      }
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T) => {
      try {
        setStoredValue(value);
        if (!isServerSide()) {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      } catch (error) {
        console.error(error);
      }
    },
    [key]
  );

  if (typeof window === "undefined") {
    return [initialValue, setValue];
  }

  return [storedValue, setValue];
}
