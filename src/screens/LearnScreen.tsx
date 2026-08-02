import React from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { Profile, Technique } from "../types";
import { TECHNIQUES, techniqueStatus } from "../techniques";
import { OPERATION_META } from "../ladders";
import { T } from "../theme";

interface Props {
  profile: Profile;
  onOpenTechnique: (t: Technique) => void;
  onBack: () => void;
}

export default function LearnScreen({ profile, onOpenTechnique, onBack }: Props) {
  const groups = new Map<string, Technique[]>();
  TECHNIQUES.forEach((t) => {
    const key = t.operationKey;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  });

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
      <Pressable onPress={onBack}>
        <Text style={{ color: T.textDim, marginBottom: 8 }}>← Home</Text>
      </Pressable>
      <Text style={s.h1}>Learn</Text>
      <Text style={s.sub}>
        Techniques unlock by rating — never by finishing earlier lessons first.
      </Text>

      {[...groups.entries()].map(([op, techniques]) => (
        <View key={op}>
          <Text style={s.groupLabel}>{OPERATION_META[op as keyof typeof OPERATION_META].name}</Text>
          {techniques.map((t) => {
            const status = techniqueStatus(t, profile);
            const locked = status === "locked";
            return (
              <Pressable
                key={t.id}
                style={[s.card, locked && { opacity: 0.5 }]}
                onPress={() => !locked && onOpenTechnique(t)}
                disabled={locked}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={s.cardTitle}>{t.name}</Text>
                    <Text style={s.cardSummary}>{t.summary}</Text>
                  </View>
                  <StatusBadge status={status} unlock={t.ratingUnlock} />
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

function StatusBadge({ status, unlock }: { status: string; unlock: number }) {
  if (status === "locked")
    return <Text style={[s.badge, { color: T.textFaint }]}>🔒 {unlock}</Text>;
  if (status === "completed" || status === "mastered")
    return <Text style={[s.badge, { color: T.green }]}>✓ Learned</Text>;
  return <Text style={[s.badge, { color: T.purple }]}>Open →</Text>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  h1: { color: T.text, fontSize: 26, fontWeight: "600" },
  sub: { color: T.textDim, fontSize: 13, marginTop: 4, marginBottom: 12 },
  groupLabel: { color: T.textFaint, fontSize: 12, marginTop: 16, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTitle: { color: T.text, fontSize: 15, fontWeight: "600" },
  cardSummary: { color: T.textDim, fontSize: 12, marginTop: 3 },
  badge: { fontSize: 12, fontWeight: "600" },
});
