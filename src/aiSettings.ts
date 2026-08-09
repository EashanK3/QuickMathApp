import AsyncStorage from "@react-native-async-storage/async-storage";

// Separate from Profile on purpose — this is device/environment config
// (where's the Ollama server), not player progress.
const KEY = "quickmath.aiSettings.v1";

export interface AISettings {
  ollamaHost: string;
  model: string;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  ollamaHost: "http://192.168.1.169:11434",
  model: "llama3.2:3b",
};

export async function loadAISettings(): Promise<AISettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export async function saveAISettings(settings: AISettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // non-fatal — settings just won't persist this session
  }
}
