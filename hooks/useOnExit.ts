import { useEffect } from "react";

/**
 * Runs the provided callback when:
 * - The component unmounts
 * - The user navigates away (using Next.js navigation)
 * - The user refreshes or closes the tab
 *
 * @param onExit - A function wrapped in `useCallback` that will be executed on exit.
 */
export function useOnExit(onExit: () => void) {
  useEffect(() => {
    const handleExit = () => {
      onExit();
    };

    window.addEventListener("beforeunload", handleExit);

    return () => {
      window.removeEventListener("beforeunload", handleExit);
      onExit();
    };
  }, [onExit]);
}
