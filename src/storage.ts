import AsyncStorage from "@react-native-async-storage/async-storage";
import { ErrorType, MAX_HISTORY, Profile, DEFAULT_PROFILE, SessionRecord, SessionSummary } from "./types";

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
    history: [],
  };
}

// When the local profile was last changed (ms since epoch). Used to decide
// whether this device or the account's cloud copy is newer.
const UPDATED_KEY = "quickmath.profileUpdatedAt.v1";

// Merges a saved profile (local or from the cloud) over the defaults, so new
// fields survive app updates.
export function normalizeProfile(parsed: any): Profile {
  if (!parsed || typeof parsed !== "object") return freshProfile();
  return {
    ...freshProfile(),
    ...parsed,
    ratings: { ...DEFAULT_PROFILE.ratings, ...(parsed.ratings ?? {}) },
    vedicRating: parsed.vedicRating ?? DEFAULT_PROFILE.vedicRating,
    shields: parsed.shields ?? {},
    techniqueProgress: parsed.techniqueProgress ?? {},
    // profiles saved before history existed simply have none yet
    history: Array.isArray(parsed.history) ? parsed.history : [],
  };
}

export async function loadProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return freshProfile();
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return freshProfile();
  }
}

// 0 means "never saved on this device".
export async function loadProfileUpdatedAt(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(UPDATED_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function sessionRecordFromSummary(summary: SessionSummary): SessionRecord {
  const errorCounts: Partial<Record<ErrorType, number>> = {};
  let totalTimeMs = 0;
  let correctCount = 0;
  for (const r of summary.results) {
    totalTimeMs += r.timeTakenMs;
    if (r.isCorrect) correctCount++;
    else errorCounts[r.errorType] = (errorCounts[r.errorType] ?? 0) + 1;
  }
  return {
    timestamp: Date.now(),
    operationKey: summary.operationKey,
    rungIndex: summary.rungIndex,
    isVedic: summary.isVedic,
    ratingBefore: summary.ratingBefore,
    ratingAfter: summary.ratingAfter,
    correctCount,
    totalCount: summary.results.length,
    avgTimeMs: summary.results.length ? totalTimeMs / summary.results.length : 0,
    errorCounts,
  };
}

// Appends a session, dropping the oldest entries beyond MAX_HISTORY.
export function appendSessionRecord(profile: Profile, record: SessionRecord): Profile {
  const next = [...profile.history, record];
  return {
    ...profile,
    history: next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next,
  };
}

// Writes are serialized: saves fire from render callbacks (every answered
// question, quit, lesson completion) and an unordered setItem race could let an
// older profile land after a newer one and silently roll back the rating.
let writeChain: Promise<void> = Promise.resolve();

export function saveProfile(profile: Profile, updatedAt: number = Date.now()): Promise<void> {
  const snapshot = JSON.stringify(profile);
  writeChain = writeChain.then(async () => {
    try {
      await AsyncStorage.setItem(KEY, snapshot);
      await AsyncStorage.setItem(UPDATED_KEY, String(updatedAt));
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
