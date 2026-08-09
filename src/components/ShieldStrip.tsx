import React from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { T } from "../theme";
import { usePulse } from "../hooks/usePulse";

interface Props {
  remaining: number; // shield.remaining, 1..3
  caption: string;
  label?: string;
  // Whether the strip animates its own pulsing border/glow. Set false when a
  // parent card already carries the pulse (Home), true when this strip is the
  // only shielded surface on screen (Practice).
  pulse?: boolean;
}

export default function ShieldStrip({ remaining, caption, label = "Promotion shield", pulse = true }: Props) {
  // borderColor/shadowOpacity aren't supported by the native driver.
  const anim = usePulse(pulse, 1200, false);

  const borderColor = pulse
    ? anim.interpolate({ inputRange: [0, 1], outputRange: ["rgba(229,83,75,0.35)", "rgba(229,83,75,0.55)"] })
    : "rgba(229,83,75,0.35)";
  const shadowOpacity = pulse ? anim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] }) : 0;

  return (
    <Animated.View
      style={[
        s.card,
        {
          borderColor,
          shadowColor: T.red,
          shadowOpacity,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    >
      <View style={s.headerRow}>
        <Text style={s.label}>{label}</Text>
        <View style={s.pips}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[s.pip, i < remaining ? s.pipLit : s.pipEmpty]} />
          ))}
        </View>
      </View>
      <Text style={s.caption}>{caption}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(229,83,75,0.1)",
    borderWidth: 1,
    borderRadius: 11,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: T.red, fontSize: 11, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  pips: { flexDirection: "row", gap: 4 },
  pip: { width: 14, height: 6, borderRadius: 3 },
  pipLit: {
    backgroundColor: T.red,
    shadowColor: T.red,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  pipEmpty: { backgroundColor: "rgba(229,83,75,0.15)", borderWidth: 1, borderColor: "rgba(229,83,75,0.35)" },
  caption: { color: T.red, fontSize: 11, marginTop: 6, opacity: 0.88 },
});
