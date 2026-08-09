import { createClient } from "@supabase/supabase-js";

// The anon key is DESIGNED to ship in client code — it's public by nature,
// protected by Row Level Security policies (see supabase/schema.sql), not by
// secrecy. Never put a service_role key here.
const SUPABASE_URL = "https://kkxwguydhzemmwvwnbdg.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHdndXlkaHplbW13dnduYmRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMjM5OTksImV4cCI6MjEwMTc5OTk5OX0.DhlIHzh8BER2k0avy2QcBrcCmzdB1gh3svZCd3kqE9U";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }, // no login system — every device is anonymous
});
