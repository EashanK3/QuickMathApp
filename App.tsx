import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StatusBar, Pressable, Text, StyleSheet } from "react-native";
import { Profile, OperationKey, SessionSummary, Technique } from "./src/types";
import {
  loadProfile,
  loadProfileUpdatedAt,
  saveProfile,
  freshProfile,
  touchStreak,
  appendSessionRecord,
  sessionRecordFromSummary,
} from "./src/storage";
import { AccountUser, getSignedInUser, queueCloudSave, signOut, syncProfile } from "./src/account";
import { supabase } from "./src/supabaseConfig";
import AccountScreen from "./src/screens/AccountScreen";
import HomeScreen from "./src/screens/HomeScreen";
import PracticeScreen from "./src/screens/PracticeScreen";
import ResultsScreen from "./src/screens/ResultsScreen";
import LearnScreen from "./src/screens/LearnScreen";
import TechniqueScreen from "./src/screens/TechniqueScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import FriendModeScreen from "./src/screens/FriendModeScreen";
import NavDrawer, { DrawerDestination } from "./src/components/NavDrawer";
import { T } from "./src/theme";

type Screen =
  | { name: "home" }
  | { name: "practice"; op: OperationKey; isVedic?: boolean; vedicRung?: number; techniqueId?: string }
  | { name: "results"; summary: SessionSummary }
  | { name: "learn" }
  | { name: "technique"; technique: Technique }
  | { name: "profile" }
  | { name: "friendMode" }
  | { name: "account" };

// Drawer destinations are a subset of Screen — this maps one to the other.
function drawerDestinationFor(screen: Screen): DrawerDestination {
  if (screen.name === "profile") return "profile";
  if (screen.name === "friendMode") return "friendMode";
  if (screen.name === "account") return "account";
  return "home";
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const local = { profile: await loadProfile(), updatedAt: await loadProfileUpdatedAt() };
      let signedIn: AccountUser | null = null;
      try {
        signedIn = await getSignedInUser();
      } catch {
        // can't read the saved session: play signed out
      }
      let synced = local;
      if (signedIn) {
        synced = await syncProfile(signedIn.id, local, "launch");
        if (synced !== local) saveProfile(synced.profile, synced.updatedAt);
      }
      setUser(signedIn);
      setProfile(synced.profile);
    })();

    // e.g. the session expired or was revoked on the server
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setUser(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  function persist(p: Profile) {
    const updatedAt = Date.now();
    setProfile(p);
    saveProfile(p, updatedAt);
    if (user) queueCloudSave(user.id, p, updatedAt);
  }

  async function handleSignedIn(signedIn: AccountUser) {
    const local = { profile: profile ?? freshProfile(), updatedAt: await loadProfileUpdatedAt() };
    const synced = await syncProfile(signedIn.id, local, "signIn");
    saveProfile(synced.profile, synced.updatedAt);
    setProfile(synced.profile);
    setUser(signedIn);
  }

  // The account's progress stays in the cloud; this device goes back to a
  // fresh guest profile so the next person doesn't inherit it.
  async function handleSignOut() {
    await signOut();
    const fresh = freshProfile();
    setUser(null);
    setProfile(fresh);
    saveProfile(fresh);
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={T.gold} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="light-content" />
      {screen.name === "home" && (
        <HomeScreen
          profile={profile}
          onPractice={(op) => setScreen({ name: "practice", op })}
          onLearn={() => setScreen({ name: "learn" })}
        />
      )}
      {screen.name === "practice" && (
        <PracticeScreen
          profile={profile}
          operationKey={screen.op}
          isVedic={screen.isVedic}
          vedicRungIndex={screen.vedicRung}
          // Fires after EVERY answered question so a quit / crash / backgrounding
          // mid-session can no longer throw away the rating earned so far.
          onProfileChange={(updated) => persist(updated)}
          onFinish={(summary, updated) => {
            const withHistory = appendSessionRecord(updated, sessionRecordFromSummary(summary));
            persist(touchStreak(withHistory));
            setScreen({ name: "results", summary });
          }}
          onOpenTechnique={(t) => setScreen({ name: "technique", technique: t })}
          onQuit={(updated) => {
            persist(touchStreak(updated));
            setScreen({ name: "home" });
          }}
        />
      )}
      {screen.name === "results" && (
        <ResultsScreen
          summary={screen.summary}
          onPlayAgain={() =>
            setScreen({
              name: "practice",
              op: screen.summary.operationKey,
              isVedic: screen.summary.isVedic,
              // Keep a technique drill on the rung it was launched at; without this
              // the replay silently jumps to whatever rung the Vedic rating maps to.
              vedicRung: screen.summary.isVedic ? screen.summary.rungIndex : undefined,
            })
          }
          onHome={() => setScreen({ name: "home" })}
          onOpenTechnique={(t) => setScreen({ name: "technique", technique: t })}
        />
      )}
      {screen.name === "learn" && (
        <LearnScreen
          profile={profile}
          onOpenTechnique={(t) => setScreen({ name: "technique", technique: t })}
          onBack={() => setScreen({ name: "home" })}
        />
      )}
      {screen.name === "technique" && (
        <TechniqueScreen
          profile={profile}
          technique={screen.technique}
          onCompleteLesson={() => {
            persist({
              ...profile,
              techniqueProgress: { ...profile.techniqueProgress, [screen.technique.id]: "completed" },
            });
          }}
          onStartDrill={() =>
            setScreen({
              name: "practice",
              op: screen.technique.operationKey,
              isVedic: true,
              vedicRung: screen.technique.drillRungIndex,
            })
          }
          onBack={() => setScreen({ name: "learn" })}
        />
      )}
      {screen.name === "profile" && <ProfileScreen profile={profile} onBack={() => setScreen({ name: "home" })} />}
      {screen.name === "friendMode" && (
        <FriendModeScreen profile={profile} onBack={() => setScreen({ name: "home" })} />
      )}
      {screen.name === "account" && (
        <AccountScreen
          user={user}
          onSignedIn={handleSignedIn}
          onSignOut={handleSignOut}
          onBack={() => setScreen({ name: "home" })}
        />
      )}

      {/* Hidden mid-question — a stray tap shouldn't back out of a timed session. */}
      {screen.name !== "practice" && (
        <Pressable style={s.hamburger} onPress={() => setDrawerOpen(true)} hitSlop={10}>
          <Text style={{ color: T.text, fontSize: 20 }}>☰</Text>
        </Pressable>
      )}
      <NavDrawer
        visible={drawerOpen}
        current={drawerDestinationFor(screen)}
        onClose={() => setDrawerOpen(false)}
        onNavigate={(dest) => {
          setDrawerOpen(false);
          if (dest === "profile") setScreen({ name: "profile" });
          else if (dest === "friendMode") setScreen({ name: "friendMode" });
          else if (dest === "account") setScreen({ name: "account" });
          else setScreen({ name: "home" });
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  hamburger: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
});
