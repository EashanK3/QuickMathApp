// Thin client for a local Ollama server. No cloud provider, no API key —
// deliberately, since the whole point is a free, local AI coach.

export interface OllamaConfig {
  host: string; // e.g. "http://192.168.1.169:11434"
  model: string; // e.g. "llama3.2:3b"
}

const TIMEOUT_MS = 30000;
const REACHABLE_TIMEOUT_MS = 3000;

// Quick check that an Ollama server answers at `host`. Used to hide the AI
// coach for players who aren't on the same network as the Ollama computer.
export async function isOllamaReachable(host: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REACHABLE_TIMEOUT_MS);
  try {
    const res = await fetch(`${host.replace(/\/$/, "")}/api/tags`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function ollamaGenerate(config: OllamaConfig, prompt: string, system: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${config.host.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        prompt,
        system,
        stream: false,
        options: { temperature: 0.4 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Ollama returned HTTP ${res.status} — is "${config.model}" pulled?`);
    }
    const data = await res.json();
    const text = typeof data.response === "string" ? data.response.trim() : "";
    if (!text) throw new Error("Ollama returned an empty response.");
    return text;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`Ollama didn't respond within ${TIMEOUT_MS / 1000}s — is it running at ${config.host}?`);
    }
    if (e instanceof TypeError) {
      // fetch's generic network-failure error — unreachable host, wrong IP, firewall, etc.
      throw new Error(`Couldn't reach Ollama at ${config.host}. Check it's running and on the same network.`);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
