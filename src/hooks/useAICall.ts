import { useCallback, useRef, useState } from "react";

// Generic "call an async AI function, track loading/result/error" hook.
// Guards against a stale response landing after a newer call started (e.g.
// user taps the button twice) by tagging each call with an id.
export function useAICall(fn: () => Promise<string>) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const callId = useRef(0);

  const run = useCallback(async () => {
    const id = ++callId.current;
    setLoading(true);
    setError(null);
    try {
      const text = await fn();
      if (id === callId.current) setResult(text);
    } catch (e) {
      if (id === callId.current) setError(e instanceof Error ? e.message : "AI request failed.");
    } finally {
      if (id === callId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn]);

  const reset = useCallback(() => {
    callId.current++;
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { loading, result, error, run, reset };
}
