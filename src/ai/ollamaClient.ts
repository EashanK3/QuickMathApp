// Thin client for a local Ollama server. No cloud provider, no API key —
// deliberately, since the whole point is a free, local AI coach.

export interface OllamaConfig {
  host: string; // e.g. "http://192.168.1.169:11434"
  model: string; // e.g. "llama3.2:3b"
}

const TIMEOUT_MS = 30000;

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
