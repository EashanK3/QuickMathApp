import { useEffect, useState } from "react";
import { isOllamaReachable } from "../ai/ollamaClient";

// True once the Ollama server at `host` has answered. Stays false while
// checking and when it can't be reached, so the AI coach stays hidden for
// players on other networks. Rechecks whenever the host changes.
export function useOllamaReachable(host: string): boolean {
  const [reachable, setReachable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setReachable(false);
    isOllamaReachable(host).then((ok) => {
      if (!cancelled) setReachable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [host]);
  return reachable;
}
