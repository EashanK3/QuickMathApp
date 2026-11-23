import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Separate from Profile on purpose — this is device/environment config
// (where's the Ollama server), not player progress.
const KEY = "quickmath.aiSettings.v1";

export interface AISettings {
  // Empty string = auto-detect (see autoOllamaHost). A non-empty value is a
  // manual override typed on the Profile screen.
  ollamaHost: string;
  model: string;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  ollamaHost: "",
  model: "llama3.2:3b",
};

const OLLAMA_PORT = 11434;

// The old hard-coded default. Older installs saved it into storage along with
// the rest of the settings, so treat it as "auto" rather than a real override.
const LEGACY_DEFAULT_HOST = "http://192.168.1.169:11434";

// Ollama runs on the same computer as the Expo dev server, so reuse whatever
// address the app was loaded from. This follows the computer across networks.
export function autoOllamaHost(): string {
  let host: string | undefined;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    host = window.location.hostname;
  } else {
    // hostUri looks like "10.0.0.248:8081" when running in Expo Go.
    host = Constants.expoConfig?.hostUri?.split(":")[0];
  }
  return `http://${host || "localhost"}:${OLLAMA_PORT}`;
}

// The address the AI calls should actually use.
export function effectiveOllamaHost(settings: AISettings): string {
  return settings.ollamaHost.trim() || autoOllamaHost();
}

export async function loadAISettings(): Promise<AISettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const merged: AISettings = { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
    if (merged.ollamaHost.trim() === LEGACY_DEFAULT_HOST) merged.ollamaHost = "";
    return merged;
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
