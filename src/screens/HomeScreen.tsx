import React from "react";
import { ScrollView, View, Text, Pressable, Animated, StyleSheet } from "react-native";
import { Profile, OperationKey } from "../types";
import { OPERATION_META, LADDERS, rungIndexForRating } from "../ladders";
import { tierFor, tierBarState, averageRegularRating, SQRT_UNLOCK_AVG, EXP_UNLOCK_AVG } from "../tiers";
import { T } from "../theme";
import TierBadge from "../components/TierBadge";
import ShieldStrip from "../components/ShieldStrip";
import { usePulse } from "../hooks/usePulse";

type Shield = { remaining: number; tierFloor: number } | null;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
        <RatingCard key={op} op={op} rating={profile.ratings[op]} shield={profile.shields[op] ?? null} onPress={() => onPractice(op)} />
      ))}

      <VedicCard rating={profile.vedicRating} shield={profile.shields.vedic ?? null} onPress={onLearn} />

      <Text style={s.sectionLabel}>Advanced disciplines</Text>

      <LockableCard
        title={OPERATION_META.sqrt.name}
        unlocked={sqrtUnlocked}
        unlockText={`Unlocks at avg rating ${SQRT_UNLOCK_AVG} · currently ${avg}`}
        rating={profile.ratings.sqrt}
        shield={profile.shields.sqrt ?? null}
        onPress={() => onPractice("sqrt")}
      />
      <LockableCard
        title={OPERATION_META.exp.name}
        unlocked={expUnlocked}
        unlockText={`Unlocks at avg rating ${EXP_UNLOCK_AVG} · currently ${avg}`}
        rating={profile.ratings.exp}
        shield={profile.shields.exp ?? null}
        onPress={() => onPractice("exp")}
      />
    </ScrollView>
  );
}

function VedicCard({ rating, shield, onPress }: { rating: number; shield: Shield; onPress: () => void }) {
  const pulse = usePulse(!!shield, 1300, false);
  const borderColor = shield
    ? pulse.interpolate({ inputRange: [0, 1], outputRange: ["rgba(167,139,250,0.35)", "rgba(167,139,250,0.55)"] })
    : T.purple + "55";

  return (
    <AnimatedPressable style={[s.card, { borderColor }]} onPress={onPress}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[s.cardTitle, { color: T.purple }]}>Vedic rating</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <TierBadge rating={rating} size={24} family="purple" />
          <Text style={[s.tierText, { color: T.purple }]}>{tierFor(rating).name}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={[s.rating, { color: T.purple }]}>{rating}</Text>
        <Text style={{ color: T.textDim, fontSize: 13 }}>Learn section →</Text>
      </View>
      {shield && <ShieldStrip remaining={shield.remaining} caption="Land a correct answer to cement the rank" pulse={false} />}
      <TierBar rating={rating} shield={!!shield} color={T.purple} />
    </AnimatedPressable>
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

function RatingCard({ op, rating, shield, onPress }: { op: OperationKey; rating: number; shield: Shield; onPress: () => void }) {
  const tier = tierFor(rating);
  const rung = LADDERS[op][rungIndexForRating(op, rating)];
  const pulse = usePulse(!!shield, 1300, false);
  const borderColor = shield
    ? pulse.interpolate({ inputRange: [0, 1], outputRange: ["rgba(229,83,75,0.35)", "rgba(229,83,75,0.55)"] })
    : T.border;

  return (
    <AnimatedPressable style={[s.card, { borderColor }]} onPress={onPress}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={s.cardTitle}>{OPERATION_META[op].name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <TierBadge rating={rating} size={26} />
          <Text style={s.tierText}>{tier.name}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text style={s.rating}>{rating}</Text>
        <Text style={{ color: T.textFaint, fontSize: 12 }}>current rung: {rung.description}</Text>
      </View>
      {shield && <ShieldStrip remaining={shield.remaining} caption="Land a correct answer to cement the rank" pulse={false} />}
      <TierBar rating={rating} shield={!!shield} />
    </AnimatedPressable>
  );
}

function LockableCard(props: { title: string; unlocked: boolean; unlockText: string; rating: number; shield: Shield; onPress: () => void }) {
  if (!props.unlocked) {
    return (
      <View style={[s.card, { opacity: 0.55 }]}>
        <Text style={s.cardTitle}>🔒 {props.title}</Text>
        <Text style={{ color: T.textFaint, fontSize: 12, marginTop: 4 }}>{props.unlockText}</Text>
      </View>
    );
  }
  const tier = tierFor(props.rating);
  const pulse = usePulse(!!props.shield, 1300, false);
  const borderColor = props.shield
    ? pulse.interpolate({ inputRange: [0, 1], outputRange: ["rgba(229,83,75,0.35)", "rgba(229,83,75,0.55)"] })
    : T.border;

  return (
    <AnimatedPressable style={[s.card, { borderColor }]} onPress={props.onPress}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={s.cardTitle}>{props.title}</Text>
          <View style={s.unlockedPill}>
            <Text style={s.unlockedPillText}>UNLOCKED</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <TierBadge rating={props.rating} size={26} />
          <Text style={s.tierText}>{tier.name}</Text>
        </View>
      </View>
      <Text style={s.rating}>{props.rating}</Text>
      {props.shield && <ShieldStrip remaining={props.shield.remaining} caption="Promotion shield active" pulse={false} />}
      <TierBar rating={props.rating} shield={!!props.shield} />
    </AnimatedPressable>
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
  unlockedPill: {
    borderWidth: 1,
    borderColor: T.gold + "66",
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 5,
  },
  unlockedPillText: { color: T.gold, fontSize: 9, letterSpacing: 0.4, fontWeight: "600" },
});
