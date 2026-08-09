import React from "react";
import { View, Text, Animated, ViewStyle } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Polygon, RadialGradient, Stop } from "react-native-svg";
import { T } from "../theme";
import { tierFor, tierIndexFor } from "../tiers";
import { usePulse } from "../hooks/usePulse";

type Family = "gold" | "purple";

interface TierVisual {
  ring: string;
  fill: string | string[]; // solid color, or gradient stops (2-3)
  icon: string;
  ringWidth: number;
  glowOpacity: number; // 0 = no glow halo
  glowSize: number; // halo radius beyond the badge edge
  pulse: boolean;
}

const GOLD = { bright: T.gold, dim: T.goldDim, highlight: "#F4D18A" };
// Purple mirrors the gold escalation one-for-one so both halves of the app
// (ranked ladder vs. Vedic) read as the same visual system, just recolored.
// No new hue is introduced for the top tier — unlike gold's highlight — per
// the design system's "no new colors beyond the documented tokens" rule.
const PURPLE = { bright: T.purple, dim: "#6D5DAE", highlight: T.purple };

// Escalation by tier index (0..6, matches TIERS in tiers.ts): the ring thins
// and the glow strengthens as rank climbs, culminating in an animated pulse
// at the top tier.
function visualFor(tierIndex: number, family: Family): TierVisual {
  const c = family === "gold" ? GOLD : PURPLE;
  switch (tierIndex) {
    case 0:
      return { ring: T.border, fill: T.surface, icon: T.textFaint, ringWidth: 5, glowOpacity: 0, glowSize: 0, pulse: false };
    case 1:
      return { ring: c.dim, fill: T.surface, icon: T.textDim, ringWidth: 4, glowOpacity: 0, glowSize: 0, pulse: false };
    case 2:
      return { ring: c.dim, fill: T.surfaceRaised, icon: c.bright, ringWidth: 4, glowOpacity: 0, glowSize: 0, pulse: false };
    case 3:
      return { ring: c.bright, fill: T.surfaceRaised, icon: c.bright, ringWidth: 3, glowOpacity: 0.25, glowSize: 6, pulse: false };
    case 4:
      return { ring: c.bright, fill: [c.dim, T.surfaceRaised], icon: c.bright, ringWidth: 3, glowOpacity: 0.35, glowSize: 10, pulse: false };
    case 5:
      return { ring: c.bright, fill: [c.bright, c.dim], icon: T.bg, ringWidth: 2, glowOpacity: 0.5, glowSize: 16, pulse: false };
    default:
      return { ring: c.bright, fill: [c.bright, c.highlight, c.dim], icon: T.bg, ringWidth: 1, glowOpacity: 0.55, glowSize: 18, pulse: true };
  }
}

// Matches the design reference's clip-path polygon(50% 0%, 100% 25%, 100% 75%,
// 50% 100%, 0% 75%, 0% 25%) — an elongated hexagon, not a regular one.
function hexPoints(size: number): string {
  const q = size * 0.25;
  const q3 = size * 0.75;
  return `${size / 2},0 ${size},${q} ${size},${q3} ${size / 2},${size} 0,${q3} 0,${q}`;
}

interface Props {
  rating: number;
  size?: number;
  family?: Family;
  style?: ViewStyle;
}

export default function TierBadge({ rating, size = 26, family = "gold", style }: Props) {
  const tierIndex = tierIndexFor(rating);
  const icon = tierFor(rating).icon;
  const v = visualFor(tierIndex, family);
  const pulse = usePulse(v.pulse, 1100, true);

  // The wrapping View's opacity/scale carries the pulse "breathing" motion;
  // the falloff itself lives in the radial gradient stops below so the halo
  // reads as a soft glow instead of a hard-edged translucent disc (RN has no
  // blur primitive to fake a CSS box-shadow blur with).
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
  const glowMultiplier = v.pulse ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.15] }) : 1;

  const isGradient = Array.isArray(v.fill);
  const gradId = `tier-badge-grad-${tierIndex}-${family}`;
  const glowId = `tier-badge-glow-${tierIndex}-${family}`;
  const innerSize = size - v.ringWidth * 2;
  const glowBoxSize = size + v.glowSize * 2;

  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      {v.glowOpacity > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: glowBoxSize,
            height: glowBoxSize,
            opacity: glowMultiplier,
            transform: v.pulse ? [{ scale: glowScale }] : undefined,
          }}
        >
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={v.ring} stopOpacity={Math.min(1, v.glowOpacity * 1.5)} />
                <Stop offset="55%" stopColor={v.ring} stopOpacity={v.glowOpacity * 0.5} />
                <Stop offset="100%" stopColor={v.ring} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="50" fill={`url(#${glowId})`} />
          </Svg>
        </Animated.View>
      )}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {isGradient && (
          <Defs>
            <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              {(v.fill as string[]).map((stopColor, i) => (
                <Stop key={i} offset={`${(i / ((v.fill as string[]).length - 1)) * 100}%`} stopColor={stopColor} />
              ))}
            </LinearGradient>
          </Defs>
        )}
        <Polygon points={hexPoints(size)} fill={v.ring} />
        <Polygon
          points={hexPoints(innerSize)}
          fill={isGradient ? `url(#${gradId})` : (v.fill as string)}
          transform={`translate(${v.ringWidth}, ${v.ringWidth})`}
        />
      </Svg>
      <Text
        style={{
          position: "absolute",
          fontSize: size * 0.42,
          lineHeight: size * 0.42 + 1,
          color: v.icon,
          fontWeight: tierIndex >= 5 ? "700" : "400",
        }}
      >
        {icon}
      </Text>
    </View>
  );
}
