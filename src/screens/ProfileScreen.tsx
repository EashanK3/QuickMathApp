import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { Profile, OperationKey } from "../types";
import { OPERATION_META, LADDERS } from "../ladders";
import { ERROR_LABELS } from "../questions";
import { T } from "../theme";
import TierBadge from "../components/TierBadge";
import { AISettings, DEFAULT_AI_SETTINGS, loadAISettings, saveAISettings } from "../aiSettings";
import { summarizePatterns } from "../ai/patternSummary";
import { useAICall } from "../hooks/useAICall";

interface Props {
  profile: Profile;
  onBack: () => void;
}

const OPS: OperationKey[] = ["add", "sub", "mult", "div", "sqrt", "exp"];

export default function ProfileScreen({ profile, onBack }: Props) {
  const history = profile.history;
  const totalSessions = history.length;
  const totalQuestions = history.reduce((a, h) => a + h.totalCount, 0);
  const totalCorrect = history.reduce((a, h) => a + h.correctCount, 0);
  const accuracy = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : null;

  const errorTotals = new Map<string, number>();
  history.forEach((h) => {
    Object.entries(h.errorCounts).forEach(([type, count]) => {
      errorTotals.set(type, (errorTotals.get(type) ?? 0) + (count ?? 0));
    });
  });
  const topError = [...errorTotals.entries()].sort((a, b) => b[1] - a[1])[0];

  const recent = [...history].reverse().slice(0, 10);

  const [aiSettings, setAiSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [hostInput, setHostInput] = useState(DEFAULT_AI_SETTINGS.ollamaHost);
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => {
    loadAISettings().then((s) => {
      setAiSettings(s);
      setHostInput(s.ollamaHost);
    });
  }, []);

  const patternSummary = useAICall(() =>
    summarizePatterns({ host: aiSettings.ollamaHost, model: aiSettings.model }, profile)
  );

  function saveHost() {
    const next = { ...aiSettings, ollamaHost: hostInput.trim() };
    setAiSettings(next);
    saveAISettings(next);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
      <Pressable onPress={onBack}>
        <Text style={{ color: T.textDim, marginBottom: 8 }}>← Home</Text>
      </Pressable>
      <Text style={s.h1}>Profile</Text>
      <Text style={s.sub}>{profile.streakCount > 0 ? `${profile.streakCount}-day streak` : "No streak yet"}</Text>

      <View style={s.statRow}>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Sessions played</Text>
          <Text style={s.statValue}>{totalSessions}</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Questions answered</Text>
          <Text style={s.statValue}>{totalQuestions}</Text>
        </View>
      </View>
      <View style={s.statRow}>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Overall accuracy</Text>
          <Text style={s.statValue}>{accuracy !== null ? `${accuracy}%` : "—"}</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Most common slip</Text>
          <Text style={[s.statValue, { fontSize: 15 }]} numberOfLines={1}>
            {topError ? ERROR_LABELS[topError[0] as keyof typeof ERROR_LABELS] : "—"}
          </Text>
        </View>
      </View>

      <Text style={s.sectionLabel}>AI coach (local, via Ollama)</Text>
      <View style={s.aiSection}>
        <Text style={s.aiHostLabel}>Ollama server address</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={s.hostInput}
            value={hostInput}
            onChangeText={setHostInput}
            placeholder="http://192.168.1.x:11434"
            placeholderTextColor={T.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable style={s.saveHostBtn} onPress={saveHost}>
            <Text style={{ color: T.bg, fontWeight: "600", fontSize: 13 }}>{savedFlash ? "Saved" : "Save"}</Text>
          </Pressable>
        </View>

        {!patternSummary.result && (
          <Pressable
            style={[s.summaryBtn, patternSummary.loading && { opacity: 0.6 }]}
            onPress={patternSummary.run}
            disabled={patternSummary.loading}
          >
            <Text style={{ color: T.accent, fontWeight: "600", fontSize: 14 }}>
              {patternSummary.loading ? "Analyzing your practice history…" : "Get AI pattern summary →"}
            </Text>
          </Pressable>
        )}
        {patternSummary.error && <Text style={s.aiError}>{patternSummary.error}</Text>}
        {patternSummary.result && (
          <>
            <View style={s.aiResultCard}>
              <Text style={s.aiResultText}>{patternSummary.result}</Text>
            </View>
            <Pressable onPress={patternSummary.reset} style={{ marginTop: 8 }}>
              <Text style={{ color: T.textFaint, fontSize: 12 }}>Ask again</Text>
            </Pressable>
          </>
        )}
      </View>

      <Text style={s.sectionLabel}>Ratings</Text>
      {OPS.map((op) => (
        <View key={op} style={s.ratingRow}>
          <Text style={s.ratingOp}>{OPERATION_META[op].name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={s.ratingValue}>{profile.ratings[op]}</Text>
            <TierBadge rating={profile.ratings[op]} size={22} />
          </View>
        </View>
      ))}
      <View style={s.ratingRow}>
        <Text style={[s.ratingOp, { color: T.purple }]}>Vedic</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[s.ratingValue, { color: T.purple }]}>{profile.vedicRating}</Text>
          <TierBadge rating={profile.vedicRating} size={22} family="purple" />
        </View>
      </View>

      <Text style={s.sectionLabel}>Recent sessions</Text>
      {recent.length === 0 && (
        <Text style={{ color: T.textFaint, fontSize: 13, marginBottom: 20 }}>No sessions yet — go practice!</Text>
      )}
      {recent.map((h, i) => {
        const delta = h.ratingAfter - h.ratingBefore;
        return (
          <View key={i} style={s.historyRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={s.historyOp}>
                {h.isVedic ? "Vedic drill" : OPERATION_META[h.operationKey].name} ·{" "}
                {LADDERS[h.operationKey][h.rungIndex]?.label ?? "?"}
              </Text>
              <Text style={s.historyMeta}>
                {new Date(h.timestamp).toLocaleDateString()} · {h.correctCount}/{h.totalCount} correct
              </Text>
            </View>
            <Text style={{ color: delta >= 0 ? T.green : T.red, fontWeight: "600" }}>
              {delta >= 0 ? "+" : ""}
              {delta}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  h1: { color: T.text, fontSize: 26, fontWeight: "600" },
  sub: { color: T.textDim, fontSize: 13, marginTop: 4, marginBottom: 16 },
  statRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: T.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: T.border },
  statLabel: { color: T.textDim, fontSize: 12 },
  statValue: { color: T.text, fontSize: 22, fontWeight: "600", marginTop: 3 },
  sectionLabel: { color: T.textFaint, fontSize: 12, marginTop: 20, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  ratingOp: { color: T.textDim, fontSize: 14 },
  ratingValue: { color: T.text, fontSize: 16, fontWeight: "600" },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  historyOp: { color: T.text, fontSize: 14, fontWeight: "600" },
  historyMeta: { color: T.textFaint, fontSize: 12, marginTop: 2 },
  aiSection: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 14,
  },
  aiHostLabel: { color: T.textFaint, fontSize: 11, marginBottom: 6 },
  hostInput: {
    flex: 1,
    backgroundColor: T.surfaceRaised,
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: 8,
    color: T.text,
    fontSize: 13,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  saveHostBtn: {
    backgroundColor: T.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBtn: { marginTop: 14, alignItems: "center" },
  aiError: { color: T.textFaint, fontSize: 12, marginTop: 10, textAlign: "center" },
  aiResultCard: { marginTop: 14, backgroundColor: T.surfaceRaised, borderRadius: 10, padding: 12 },
  aiResultText: { color: T.text, fontSize: 13, lineHeight: 19 },
});
