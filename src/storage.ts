import AsyncStorage from "@react-native-async-storage/async-storage";
import { Profile, DEFAULT_PROFILE } from "./types";

const KEY = "quickmath.profile.v1";

export async function loadProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    // merge over defaults so new fields survive app updates
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      ratings: { ...DEFAULT_PROFILE.ratings, ...(parsed.ratings ?? {}) },
      shields: parsed.shields ?? {},
      techniqueProgress: parsed.techniqueProgress ?? {},
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // non-fatal: ratings just won't persist this session
  }
}

export function touchStreak(profile: Profile): Profile {
  const today = new Date().toISOString().slice(0, 10);
  if (profile.lastPracticeDay === today) return profile;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = profile.lastPracticeDay === yesterday ? profile.streakCount + 1 : 1;
  return { ...profile, streakCount: streak, lastPracticeDay: today };
}
