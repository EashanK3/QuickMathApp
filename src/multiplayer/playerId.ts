import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "quickmath.playerId.v1";

function randomId(): string {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
}

// One random id per device, generated once and reused — not tied to Profile,
// since friend mode is deliberately separate from the ranked/local profile.
export async function getPlayerId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(KEY);
    if (existing) return existing;
    const fresh = randomId();
    await AsyncStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return randomId(); // ephemeral fallback if storage is unavailable
  }
}
