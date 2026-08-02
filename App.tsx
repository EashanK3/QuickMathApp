import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StatusBar } from "react-native";
import { Profile, OperationKey, SessionSummary, Technique } from "./src/types";
import { loadProfile, saveProfile, touchStreak } from "./src/storage";
import HomeScreen from "./src/screens/HomeScreen";
import PracticeScreen from "./src/screens/PracticeScreen";
import ResultsScreen from "./src/screens/ResultsScreen";
import LearnScreen from "./src/screens/LearnScreen";
import TechniqueScreen from "./src/screens/TechniqueScreen";
import { T } from "./src/theme";

type Screen =
  | { name: "home" }
  | { name: "practice"; op: OperationKey; isVedic?: boolean; vedicRung?: number; techniqueId?: string }
  | { name: "results"; summary: SessionSummary }
  | { name: "learn" }
  | { name: "technique"; technique: Technique };

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

  function persist(p: Profile) {
    setProfile(p);
    saveProfile(p);
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
            persist(touchStreak(updated));
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
    </View>
  );
}
