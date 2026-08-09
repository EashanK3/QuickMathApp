import React from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { SessionSummary, Technique, ErrorType } from "../types";
import { OPERATION_META, LADDERS, benchmarkFor } from "../ladders";
import { ERROR_LABELS } from "../questions";
import { TECHNIQUES } from "../techniques";
import { tierFor } from "../tiers";
import { T } from "../theme";
import TierBadge from "../components/TierBadge";

interface Props {
  summary: SessionSummary;
  onPlayAgain: () => void;
  onHome: () => void;
  onOpenTechnique: (t: Technique) => void;
}

export default function ResultsScreen({ summary, onPlayAgain, onHome, onOpenTechnique }: Props) {
  const { results, ratingBefore, ratingAfter } = summary;
  const delta = ratingAfter - ratingBefore;
  const correct = results.filter((r) => r.isCorrect).length;
  const accuracy = Math.round((correct / results.length) * 100);
  const avgTimeSec = results.length
    ? (results.reduce((a, r) => a + r.timeTakenMs, 0) / results.length / 1000)
    : 0;

  const errorCounts = new Map<ErrorType, number>();
  results.filter((r) => !r.isCorrect).forEach((r) => {
    errorCounts.set(r.errorType, (errorCounts.get(r.errorType) ?? 0) + 1);
  });

  const rung = LADDERS[summary.operationKey][summary.rungIndex];
  // World Cup pace: rendered ONLY when this rung IS the real discipline.
  const benchmark = benchmarkFor(summary.operationKey, summary.rungIndex);
  const pacePct = benchmark ? Math.min(100, Math.round((benchmark.recordPaceSec / avgTimeSec) * 100)) : 0;

  const climbTechnique = summary.suggestedTechniqueId
    ? TECHNIQUES.find((t) => t.id === summary.suggestedTechniqueId) ?? null
    : null;

  const tier = tierFor(ratingAfter);

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
      <Text style={s.opLabel}>
        {summary.isVedic ? "Vedic drill" : OPERATION_META[summary.operationKey].name} · {rung.description}
      </Text>

      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 4 }}>
        <Text style={s.bigRating}>{ratingAfter}</Text>
        <Text style={{ color: delta >= 0 ? T.green : T.red, fontSize: 18, fontWeight: "600" }}>
          {delta >= 0 ? "+" : ""}{delta}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
        <TierBadge rating={ratingAfter} size={36} family={summary.isVedic ? "purple" : "gold"} />
        <Text style={{ color: summary.isVedic ? T.purple : T.gold, fontSize: 14, fontWeight: "700" }}>
          {tier.name}
          {summary.promoted ? "  · promoted!" : summary.demoted ? "  · demoted" : ""}
        </Text>
      </View>

      <View style={s.statRow}>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Accuracy</Text>
          <Text style={s.statValue}>{accuracy}%</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Avg time</Text>
          <Text style={s.statValue}>{avgTimeSec.toFixed(1)}s</Text>
        </View>
      </View>

      {errorCounts.size > 0 && (
        <>
          <Text style={s.sectionLabel}>Where it went wrong</Text>
          <View style={s.card}>
            {[...errorCounts.entries()].map(([type, count]) => (
              <View key={type} style={s.errRow}>
                <Text style={{ color: T.text, fontSize: 14 }}>{ERROR_LABELS[type]}</Text>
                <Text style={{ color: T.textDim, fontSize: 14 }}>{count} miss{count > 1 ? "es" : ""}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {benchmark && avgTimeSec > 0 && (
        <>
          <Text style={s.sectionLabel}>World Cup pace</Text>
          <View style={[s.card, { borderColor: T.goldDim }]}>
            <Text style={{ color: T.text, fontSize: 14 }}>{benchmark.disciplineName}</Text>
            <View style={s.paceRow}>
              <Text style={s.paceDim}>You: {avgTimeSec.toFixed(1)}s / task</Text>
              <Text style={s.paceDim}>Record: {benchmark.recordPaceSec}s / task</Text>
            </View>
            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${pacePct}%`, backgroundColor: T.gold }]} />
            </View>
            <Text style={{ color: T.textFaint, fontSize: 11, marginTop: 6 }}>
              {pacePct}% of world-record pace · {benchmark.recordHolderNote}
            </Text>
          </View>
        </>
      )}

      {climbTechnique && (
        <Pressable style={[s.card, { borderColor: T.purple + "66" }]} onPress={() => onOpenTechnique(climbTechnique)}>
          <Text style={{ color: T.purple, fontSize: 14, fontWeight: "600" }}>
            New rung reached — this one rewards a method
          </Text>
          <Text style={{ color: T.textDim, fontSize: 13, marginTop: 4 }}>
            “{climbTechnique.name}” — {climbTechnique.summary}  →
          </Text>
        </Pressable>
      )}

      <Pressable style={s.primaryBtn} onPress={onPlayAgain}>
        <Text style={{ color: T.bg, fontWeight: "600" }}>Practice again</Text>
      </Pressable>
      <Pressable style={s.ghostBtn} onPress={onHome}>
        <Text style={{ color: T.textDim }}>Home</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  opLabel: { color: T.textDim, fontSize: 13 },
  bigRating: { color: T.text, fontSize: 40, fontWeight: "600" },
  statRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  statCard: { flex: 1, backgroundColor: T.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: T.border },
  statLabel: { color: T.textDim, fontSize: 12 },
  statValue: { color: T.text, fontSize: 24, fontWeight: "600", marginTop: 2 },
  sectionLabel: { color: T.textFaint, fontSize: 12, marginTop: 20, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  card: { backgroundColor: T.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: T.border, marginBottom: 4 },
  errRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  paceRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  paceDim: { color: T.textDim, fontSize: 13 },
  barTrack: { height: 5, backgroundColor: T.surfaceRaised, borderRadius: 3, marginTop: 8, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  primaryBtn: { backgroundColor: T.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  ghostBtn: { paddingVertical: 14, alignItems: "center" },
});
