import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AccountUser, signIn, signUp } from "../account";
import { T } from "../theme";

interface Props {
  user: AccountUser | null;
  // Called after a successful sign-in; App syncs the profile with the account.
  onSignedIn: (user: AccountUser) => Promise<void>;
  onSignOut: () => Promise<void>;
  onBack: () => void;
}

const MIN_PASSWORD = 6; // Supabase's default minimum

export default function AccountScreen({ user, onSignedIn, onSignOut, onBack }: Props) {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError("Enter your email and a password.");
      return;
    }
    if (mode === "signUp" && password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signIn") {
        await onSignedIn(await signIn(email, password));
      } else {
        const created = await signUp(email, password);
        if (created) {
          await onSignedIn(created);
        } else {
          setNotice("Account created. Open the link we emailed you, then sign in here.");
          setMode("signIn");
        }
      }
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOutPressed() {
    setBusy(true);
    try {
      await onSignOut();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 20, paddingTop: 56 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack}>
        <Text style={{ color: T.textDim, marginBottom: 8 }}>← Home</Text>
      </Pressable>
      <Text style={s.h1}>Account</Text>

      {user ? (
        <>
          <Text style={s.sub}>Your progress is saved to your account and follows you to any device you sign in on.</Text>
          <View style={s.card}>
            <Text style={s.label}>Signed in as</Text>
            <Text style={s.email}>{user.email}</Text>
          </View>
          <Pressable style={[s.secondaryBtn, busy && { opacity: 0.6 }]} onPress={signOutPressed} disabled={busy}>
            <Text style={s.secondaryBtnText}>Sign out</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={s.sub}>
            {mode === "signIn"
              ? "Sign in to save your progress to your account."
              : "Create an account. Your progress on this device moves into it."}
          </Text>

          <View style={s.card}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={T.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />
            <Text style={[s.label, { marginTop: 12 }]}>Password</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder={mode === "signUp" ? `At least ${MIN_PASSWORD} characters` : "Password"}
              placeholderTextColor={T.textFaint}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={mode === "signUp" ? "newPassword" : "password"}
              autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              onSubmitEditing={submit}
            />
          </View>

          {error && <Text style={s.error}>{error}</Text>}
          {notice && <Text style={s.notice}>{notice}</Text>}

          <Pressable style={[s.primaryBtn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={T.bg} />
            ) : (
              <Text style={s.primaryBtnText}>{mode === "signIn" ? "Sign in" : "Create account"}</Text>
            )}
          </Pressable>

          <Pressable
            style={{ marginTop: 16, alignItems: "center" }}
            onPress={() => {
              setMode(mode === "signIn" ? "signUp" : "signIn");
              setError(null);
              setNotice(null);
            }}
            disabled={busy}
          >
            <Text style={{ color: T.accent, fontSize: 14 }}>
              {mode === "signIn" ? "New here? Create an account" : "Already have an account? Sign in"}
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  h1: { color: T.text, fontSize: 26, fontWeight: "600" },
  sub: { color: T.textDim, fontSize: 13, marginTop: 4, marginBottom: 16, lineHeight: 19 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 14 },
  label: { color: T.textFaint, fontSize: 11, marginBottom: 6 },
  email: { color: T.text, fontSize: 16, fontWeight: "600" },
  input: {
    backgroundColor: T.surfaceRaised,
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: 8,
    color: T.text,
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  error: { color: T.red, fontSize: 13, marginTop: 12 },
  notice: { color: T.green, fontSize: 13, marginTop: 12, lineHeight: 19 },
  primaryBtn: {
    backgroundColor: T.accent,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 16,
  },
  primaryBtnText: { color: T.bg, fontWeight: "600", fontSize: 15 },
  secondaryBtn: {
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 16,
  },
  secondaryBtnText: { color: T.text, fontWeight: "600", fontSize: 15 },
});
