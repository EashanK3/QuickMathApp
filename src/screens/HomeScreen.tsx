import React from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { Profile, OperationKey } from "../types";
import { OPERATION_META, LADDERS, rungIndexForRating } from "../ladders";
import { tierFor, tierBarState, averageRegularRating, SQRT_UNLOCK_AVG, EXP_UNLOCK_AVG } from "../tiers";
import { T } from "../theme";

interface Props {
  profile: Profile;
  onPractice: (op: OperationKey) => void;
  onLearn: () => void;
}

const REGULAR_OPS: OperationKey[] = ["add", "sub", "mult", "div"];

export default function HomeScreen({ profile, onPractice, onLearn }: Props) {
  const avg = averageRegularRating(profile.ratings);
  const sqrtUnlocked = avg >= SQRT_UNLOCK_AVG;
  const expUnlocked = avg >= EXP_UNLOCK_AVG;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
      <Text style={s.h1}>QuickMath</Text>
      <Text style={s.sub}>
        Avg rating {avg} · {profile.streakCount > 0 ? `${profile.streakCount}-day streak` : "no streak yet"}
      </Text>

      {REGULAR_OPS.map((op) => (
        <RatingCard key={op} op={op} rating={profile.ratings[op]} shield={!!profile.shields[op]} onPress={() => onPractice(op)} />
      ))}

      <Pressable style={[s.card, { borderColor: T.purple + "55" }]} onPress={onLearn}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={[s.cardTitle, { color: T.purple }]}>Vedic rating</Text>
          <Text style={[s.tierText, { color: T.purple }]}>
            {tierFor(profile.vedicRating).icon} {tierFor(profile.vedicRating).name}
          </Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text style={[s.rating, { color: T.purple }]}>{profile.vedicRating}</Text>
          <Text style={{ color: T.textDim, fontSize: 13 }}>Learn section →</Text>
        </View>
        <TierBar rating={profile.vedicRating} shield={!!profile.shields.vedic} color={T.purple} />
      </Pressable>

      <Text style={s.sectionLabel}>Advanced disciplines</Text>

      <LockableCard
        title={OPERATION_META.sqrt.name}
        unlocked={sqrtUnlocked}
        unlockText={`Unlocks at avg rating ${SQRT_UNLOCK_AVG}`}
        rating={profile.ratings.sqrt}
        shield={!!profile.shields.sqrt}
        onPress={() => onPractice("sqrt")}
      />
      <LockableCard
        title={OPERATION_META.exp.name}
        unlocked={expUnlocked}
        unlockText={`Unlocks at avg rating ${EXP_UNLOCK_AVG}`}
        rating={profile.ratings.exp}
        shield={!!profile.shields.exp}
        onPress={() => onPractice("exp")}
      />
    </ScrollView>
  );
}

// Promotion/demotion bar. Fills toward the next tier's floor, empties toward the
// current tier's floor. A promotion lands the rating on the new floor, so the bar
// correctly reads near-empty right after one. While the promotion shield is active
// the fill turns red; the existing shield line under the card spells out why.
function TierBar({ rating, shield, color = T.gold }: { rating: number; shield: boolean; color?: string }) {
  const { progress, nextTier, pointsToPromotion } = tierBarState(rating);
  const pct = Math.round(progress * 100);
  return (
    <View style={{ marginTop: 10 }}>
      <View style={s.barTrack}>
        <View
          style={[
            s.barFill,
            {
              // minWidth keeps a just-promoted / near-empty bar visible instead of
              // collapsing to a 0-width invisible sliver.
              width: `${pct}%`,
              minWidth: pct > 0 ? 6 : 0,
              backgroundColor: shield ? T.red : color,
            },
          ]}
        />
      </View>
      <Text style={s.barCaption}>
        {nextTier
          ? `${pct}% to ${nextTier.name} · ${pointsToPromotion} MMR to go`
          : "Top tier reached"}
      </Text>
    </View>
  );
}

function RatingCard({ op, rating, shield, onPress }: { op: OperationKey; rating: number; shield: boolean; onPress: () => void }) {
  const tier = tierFor(rating);
  const rung = LADDERS[op][rungIndexForRating(op, rating)];
  return (
    <Pressable style={s.card} onPress={onPress}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={s.cardTitle}>{OPERATION_META[op].name}</Text>
        <Text style={s.tierText}>
          {tier.icon} {tier.name}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text style={s.rating}>{rating}</Text>
        <Text style={{ color: T.textFaint, fontSize: 12 }}>current rung: {rung.description}</Text>
      </View>
      <TierBar rating={rating} shield={shield} />
      {shield && <Text style={s.shieldText}>Promotion shield active — land a correct answer to cement the rank</Text>}
    </Pressable>
  );
}

function LockableCard(props: { title: string; unlocked: boolean; unlockText: string; rating: number; shield: boolean; onPress: () => void }) {
  if (!props.unlocked) {
    return (
      <View style={[s.card, { opacity: 0.55 }]}>
        <Text style={s.cardTitle}>🔒 {props.title}</Text>
        <Text style={{ color: T.textFaint, fontSize: 12, marginTop: 4 }}>{props.unlockText}</Text>
      </View>
    );
  }
  const tier = tierFor(props.rating);
  return (
    <Pressable style={s.card} onPress={props.onPress}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={s.cardTitle}>{props.title}</Text>
        <Text style={s.tierText}>{tier.icon} {tier.name}</Text>
      </View>
      <Text style={s.rating}>{props.rating}</Text>
      <TierBar rating={props.rating} shield={props.shield} />
      {props.shield && <Text style={s.shieldText}>Promotion shield active</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  h1: { color: T.text, fontSize: 28, fontWeight: "600", letterSpacing: 0.5 },
  sub: { color: T.textDim, fontSize: 13, marginTop: 4, marginBottom: 20 },
  sectionLabel: { color: T.textFaint, fontSize: 12, marginTop: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  card: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: T.textDim, fontSize: 13 },
  tierText: { color: T.gold, fontSize: 13, fontWeight: "600" },
  rating: { color: T.text, fontSize: 30, fontWeight: "600", marginTop: 2 },
  barTrack: {
    height: 8,
    width: "100%",
    backgroundColor: T.surfaceRaised,
    borderRadius: 4,
    overflow: "hidden",
    flexDirection: "row",
  },
  barFill: { height: 8, backgroundColor: T.gold, borderRadius: 4 },
  barCaption: { color: T.textFaint, fontSize: 11, marginTop: 5 },
  shieldText: { color: T.gold, fontSize: 11, marginTop: 8 },
});
