import { useEffect, useRef, useState } from "react";

export default function useAutoResetState<T>(
  initialState: T,
  duration: number,
): [T, (newState: T) => void] {
  const [state, setState] = useState(initialState);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState(initialState);
    }, duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state]);

  return [state, setState];
}
