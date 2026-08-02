import { TierDef } from "./types";

// MMR bands. The badge is the surface; the number is the engine.
export const TIERS: TierDef[] = [
  { name: "Novice",         icon: "•",  floor: 0 },
  { name: "Apprentice",     icon: "◆",  floor: 600 },
  { name: "Club",           icon: "▲",  floor: 900 },
  { name: "Expert",         icon: "★",  floor: 1200 },
  { name: "Master",         icon: "✦",  floor: 1400 },
  { name: "National",       icon: "♛",  floor: 1600 },
  { name: "World Cup level", icon: "🏆", floor: 1800 },
];

export const RATING_CEILING = 2200;

export function tierIndexFor(rating: number): number {
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (rating >= TIERS[i].floor) idx = i;
  }
  return idx;
}

export function tierFor(rating: number): TierDef {
  return TIERS[tierIndexFor(rating)];
}

export function tierCeiling(rating: number): number {
  const idx = tierIndexFor(rating);
  return idx + 1 < TIERS.length ? TIERS[idx + 1].floor : RATING_CEILING;
}

// 0..1 fill of the progress bar inside the current tier band.
// Fills toward the next tier's floor, empties toward the current tier's floor
// (i.e. toward demotion). A promotion lands the rating on the new floor, so the
// bar correctly resets near-empty at the new tier.
export function tierProgress(rating: number): number {
  const floor = tierFor(rating).floor;
  const ceil = tierCeiling(rating);
  const span = ceil - floor;
  if (!isFinite(span) || span <= 0) return 1;
  return Math.min(1, Math.max(0, (rating - floor) / span));
}

export interface TierBarState {
  tier: TierDef;
  progress: number;      // 0..1
  nextTier: TierDef | null;
  pointsToPromotion: number | null;
  pointsToDemotion: number | null; // null at the bottom tier
}

export function tierBarState(rating: number): TierBarState {
  const idx = tierIndexFor(rating);
  const tier = TIERS[idx];
  const nextTier = idx + 1 < TIERS.length ? TIERS[idx + 1] : null;
  return {
    tier,
    progress: tierProgress(rating),
    nextTier,
    pointsToPromotion: nextTier ? Math.max(0, nextTier.floor - rating) : null,
    pointsToDemotion: idx > 0 ? Math.max(0, rating - tier.floor) : null,
  };
}

export function averageRegularRating(ratings: Record<string, number>): number {
  return Math.round((ratings.add + ratings.sub + ratings.mult + ratings.div) / 4);
}

export const SQRT_UNLOCK_AVG = 1400;
export const EXP_UNLOCK_AVG = 1600;
