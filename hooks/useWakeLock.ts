import * as React from "react";
import { useCallback, useMemo, useRef } from "react";

export function useWakeLock() {
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  const isSupported = useMemo(
    () => typeof window !== "undefined" && "wakeLock" in navigator,
    [],
  );

  const request = useCallback(async () => {
    if (!isSupported || wakeLock.current) {
      return;
    }

    try {
      wakeLock.current = await navigator.wakeLock.request();

      wakeLock.current.onrelease = () => {
        wakeLock.current = null;
      };
    } catch (error: any) {
      console.error(error);
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    if (!isSupported || !wakeLock.current) {
      return;
    }

    await wakeLock.current.release();
  }, [isSupported]);

  return {
    isSupported,
    request,
    release,
  };
}
