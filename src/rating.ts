import { Profile } from "./types";
import { TIERS, tierIndexFor, RATING_CEILING } from "./tiers";

// Per-question rating delta.
// Correct: +10..+22 depending on speed vs the rung's par time.
// Wrong/timeout: −14.
export function deltaForAnswer(isCorrect: boolean, timeMs: number, parTimeSec: number): number {
  if (!isCorrect) return -14;
  const speedBonus = Math.min(1, Math.max(0, 1 - timeMs / (parTimeSec * 1000)));
  return Math.round(10 + 12 * speedBonus);
}

export interface RatingUpdateOutcome {
  newRating: number;
  promoted: boolean;
  demoted: boolean;
  shieldConsumed: boolean;
}

// Applies a delta with promotion-shield semantics.
// Shield rules (as designed):
//  - ONE-TIME buffer granted only at the moment of promotion.
//  - While active, a wrong answer that would drop you below the new tier floor
//    is clamped at the floor and consumes one of 3 shields.
//  - A correct answer cements the rank: shield state is cleared.
//  - Burning all 3 shields without a correct answer demotes you below the floor.
//  - Re-entering a tier from above later grants NO new shield.
export function applyDelta(
  profile: Profile,
  ratingKey: string, // OperationKey or "vedic"
  current: number,
  delta: number
): RatingUpdateOutcome {
  const shield = profile.shields[ratingKey] ?? null;
  const beforeTier = tierIndexFor(current);
  let next = Math.max(0, Math.min(RATING_CEILING, current + delta));
  let promoted = false;
  let demoted = false;
  let shieldConsumed = false;

  if (shield && delta < 0 && next < shield.tierFloor) {
    // Shield intercepts the demotion attempt
    if (shield.remaining > 1) {
      profile.shields[ratingKey] = { ...shield, remaining: shield.remaining - 1 };
      next = shield.tierFloor; // clamp at floor
      shieldConsumed = true;
    } else {
      // Third strike: demote for real
      profile.shields[ratingKey] = null;
      next = shield.tierFloor - 25;
      demoted = true;
    }
  } else if (shield && delta > 0) {
    // Correct answer cements the new rank — shield is spent forever
    profile.shields[ratingKey] = null;
  }

  const afterTier = tierIndexFor(next);
  if (afterTier > beforeTier) {
    promoted = true;
    // Grant the one-time promotion shield
    profile.shields[ratingKey] = { remaining: 3, tierFloor: TIERS[afterTier].floor };
  } else if (afterTier < beforeTier && !demoted) {
    demoted = true; // natural demotion (no shield active)
  }

  return { newRating: next, promoted, demoted, shieldConsumed };
}
