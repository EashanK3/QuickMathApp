import React from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { Profile, Technique } from "../types";
import { techniqueStatus } from "../techniques";
import { T } from "../theme";

interface Props {
  profile: Profile;
  technique: Technique;
  onCompleteLesson: () => void; // sets status=completed → nudges silenced forever
  onStartDrill: () => void;     // launches a vedic-rated drill at drillRungIndex
  onBack: () => void;
}

export default function TechniqueScreen({ profile, technique, onCompleteLesson, onStartDrill, onBack }: Props) {
  const status = techniqueStatus(technique, profile);
  const done = status === "completed" || status === "mastered";

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
      <Pressable onPress={onBack}>
        <Text style={{ color: T.textDim, marginBottom: 8 }}>← Back</Text>
      </Pressable>

      <Text style={s.h1}>{technique.name}</Text>
      <Text style={s.sub}>{technique.summary}</Text>

      <View style={s.card}>
        {technique.steps.map((step, i) => (
          <View key={i} style={s.stepRow}>
            <Text style={s.stepNum}>{i + 1}</Text>
            <Text style={s.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      {!done ? (
        <Pressable style={s.primaryBtn} onPress={onCompleteLesson}>
          <Text style={{ color: T.bg, fontWeight: "600" }}>Mark lesson complete</Text>
        </Pressable>
      ) : (
        <Text style={{ color: T.green, textAlign: "center", marginTop: 20, fontSize: 13 }}>
          ✓ Lesson complete — practice nudges for this technique are silenced
        </Text>
      )}

      <Pressable style={s.drillBtn} onPress={onStartDrill}>
        <Text style={{ color: T.purple, fontWeight: "600" }}>Try a practice drill (Vedic-rated) →</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  h1: { color: T.text, fontSize: 24, fontWeight: "600" },
  sub: { color: T.textDim, fontSize: 13, marginTop: 4, marginBottom: 16 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 14, padding: 16 },
  stepRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  stepNum: { color: T.purple, fontWeight: "600", fontSize: 14, width: 18 },
  stepText: { color: T.text, fontSize: 14, flex: 1, lineHeight: 21 },
  primaryBtn: { backgroundColor: T.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  drillBtn: {
    borderWidth: 1,
    borderColor: T.purple + "66",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
});
