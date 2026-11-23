import { supabase } from "./supabaseConfig";
import { normalizeProfile } from "./storage";
import { Profile } from "./types";

// Optional accounts (Supabase email + password). Signed-out players keep
// playing on a device-only profile. A signed-in player's profile is also kept
// in the `profiles` table (see supabase/schema.sql), one row per account.

export interface AccountUser {
  id: string;
  email: string;
}

export interface SyncedProfile {
  profile: Profile;
  updatedAt: number;
}

export function toAccountUser(user: { id: string; email?: string | null } | null | undefined): AccountUser | null {
  return user ? { id: user.id, email: user.email ?? "" } : null;
}

export async function getSignedInUser(): Promise<AccountUser | null> {
  const { data } = await supabase.auth.getSession();
  return toAccountUser(data.session?.user);
}

// Returns null when the account has no saved profile yet. Throws on network
// or server errors so callers can fall back to the device profile.
async function cloudLoad(userId: string): Promise<SyncedProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("data, updated_ms")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { profile: normalizeProfile(data.data), updatedAt: Number(data.updated_ms) || 0 };
}

async function cloudSave(userId: string, synced: SyncedProfile): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, data: synced.profile, updated_ms: synced.updatedAt });
  if (error) throw error;
}

// Saves fire after every answered question, so batch them: only the latest
// profile is sent, a moment after the last change.
const SAVE_DELAY_MS = 1500;
let pending: { userId: string; synced: SyncedProfile } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let sending: Promise<void> = Promise.resolve();

export function queueCloudSave(userId: string, profile: Profile, updatedAt: number): void {
  pending = { userId, synced: { profile, updatedAt } };
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    flushCloudSave();
  }, SAVE_DELAY_MS);
}

// Sends any queued save now. Sends run one at a time, so an older profile can
// never land after a newer one.
export function flushCloudSave(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const next = pending;
  pending = null;
  if (!next) return sending;
  sending = sending.then(async () => {
    try {
      await cloudSave(next.userId, next.synced);
    } catch {
      // Offline or server error. The device copy is still saved and carries a
      // newer timestamp, so the next app launch uploads it (see syncProfile).
    }
  });
  return sending;
}

// Decides which profile a signed-in player should use.
//  - The account has no saved profile yet (a new account): upload this
//    device's progress, so guest progress moves into the account.
//  - "signIn": the player just signed in; the account's saved progress wins.
//  - "launch": the app opened with the player already signed in; whichever
//    copy changed most recently wins, and a newer device copy is uploaded.
// If the cloud can't be reached, the device profile is used as-is.
export async function syncProfile(
  userId: string,
  local: SyncedProfile,
  mode: "signIn" | "launch"
): Promise<SyncedProfile> {
  let cloud: SyncedProfile | null;
  try {
    cloud = await cloudLoad(userId);
  } catch {
    return local;
  }
  if (!cloud) {
    const uploaded = { ...local, updatedAt: local.updatedAt || Date.now() };
    await cloudSave(userId, uploaded).catch(() => {});
    return uploaded;
  }
  if (mode === "signIn" || cloud.updatedAt >= local.updatedAt) return cloud;
  await cloudSave(userId, local).catch(() => {});
  return local;
}

// Supabase's error messages, reworded where the original is unclear to players.
function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Wrong email or password.";
  if (/email not confirmed/i.test(message)) return "Confirm your email first — check your inbox for the link.";
  if (/already registered/i.test(message)) return "That email already has an account. Sign in instead.";
  return message;
}

export async function signIn(email: string, password: string): Promise<AccountUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(friendlyAuthError(error.message));
  const user = toAccountUser(data.user);
  if (!user) throw new Error("Sign-in failed. Try again.");
  return user;
}

// Returns the user when the account is ready to use right away, or null when
// Supabase sent a confirmation email that must be opened before signing in.
export async function signUp(email: string, password: string): Promise<AccountUser | null> {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw new Error(friendlyAuthError(error.message));
  return data.session ? toAccountUser(data.user) : null;
}

export async function signOut(): Promise<void> {
  await flushCloudSave();
  await supabase.auth.signOut();
}
