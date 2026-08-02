import AsyncStorage from "@react-native-async-storage/async-storage";
import { Profile, DEFAULT_PROFILE } from "./types";

const KEY = "quickmath.profile.v1";

// DEFAULT_PROFILE is a module-level const, so a shallow spread hands out the
// SAME ratings/shields/techniqueProgress objects every time. The rating engine
// writes shields in place, which would then mutate the defaults for the rest of
// the process. Always hand back a fully detached copy.
export function freshProfile(): Profile {
  return {
    ...DEFAULT_PROFILE,
    ratings: { ...DEFAULT_PROFILE.ratings },
    shields: { ...DEFAULT_PROFILE.shields },
    techniqueProgress: { ...DEFAULT_PROFILE.techniqueProgress },
  };
}

export async function loadProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return freshProfile();
    const parsed = JSON.parse(raw);
    // merge over defaults so new fields survive app updates
    return {
      ...freshProfile(),
      ...parsed,
      ratings: { ...DEFAULT_PROFILE.ratings, ...(parsed.ratings ?? {}) },
      vedicRating: parsed.vedicRating ?? DEFAULT_PROFILE.vedicRating,
      shields: parsed.shields ?? {},
      techniqueProgress: parsed.techniqueProgress ?? {},
    };
  } catch {
    return freshProfile();
  }
}

// Writes are serialized: saves fire from render callbacks (every answered
// question, quit, lesson completion) and an unordered setItem race could let an
// older profile land after a newer one and silently roll back the rating.
let writeChain: Promise<void> = Promise.resolve();

export function saveProfile(profile: Profile): Promise<void> {
  const snapshot = JSON.stringify(profile);
  writeChain = writeChain.then(async () => {
    try {
      await AsyncStorage.setItem(KEY, snapshot);
    } catch {
      // non-fatal: ratings just won't persist this session
    }
  });
  return writeChain;
}

export function touchStreak(profile: Profile): Profile {
  const today = new Date().toISOString().slice(0, 10);
  if (profile.lastPracticeDay === today) return profile;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = profile.lastPracticeDay === yesterday ? profile.streakCount + 1 : 1;
  return { ...profile, streakCount: streak, lastPracticeDay: today };
}
