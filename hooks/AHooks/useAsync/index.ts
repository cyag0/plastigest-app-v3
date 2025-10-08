import { useEffect } from "react";

export function useAsync(effect: () => Promise<void>) {
  useEffect(() => {
    effect();
  }, []);
}
