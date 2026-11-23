import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

// The anon key is DESIGNED to ship in client code — it's public by nature,
// protected by Row Level Security policies (see supabase/schema.sql), not by
// secrecy. Never put a service_role key here.
const SUPABASE_URL = "https://kkxwguydhzemmwvwnbdg.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHdndXlkaHplbW13dnduYmRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMjM5OTksImV4cCI6MjEwMTc5OTk5OX0.DhlIHzh8BER2k0avy2QcBrcCmzdB1gh3svZCd3kqE9U";

// Accounts are optional: signed-out players still connect as `anon`. When a
// player signs in, the session is kept in AsyncStorage so they stay signed in
// across app launches.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// On native, timers don't run while the app is in the background, so only
// refresh the session token while the app is in the foreground.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
