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

// 0..1 fill of the progress bar inside the current tier band
export function tierProgress(rating: number): number {
  const floor = tierFor(rating).floor;
  const ceil = tierCeiling(rating);
  return Math.min(1, Math.max(0, (rating - floor) / (ceil - floor)));
}

export function averageRegularRating(ratings: Record<string, number>): number {
  return Math.round((ratings.add + ratings.sub + ratings.mult + ratings.div) / 4);
}

export const SQRT_UNLOCK_AVG = 1400;
export const EXP_UNLOCK_AVG = 1600;
