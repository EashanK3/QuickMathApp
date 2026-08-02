import { Profile, Technique, TechniqueStatus } from "./types";

// Access is gated by RATING, never by completing earlier techniques.
//
// drillRungIndex is deliberately well BELOW minRungIndex. minRungIndex is the rung
// at which a technique becomes worth suggesting; the drill is where you first meet
// the method, so it starts at the easiest rung on that ladder where the technique
// still makes sense. Someone brand new to a method should land on numbers small
// enough to actually get right.
export const TECHNIQUES: Technique[] = [
  {
    id: "mult-by-11",
    name: "Multiplying by 11",
    operationKey: "mult",
    minRungIndex: 0,
    ratingUnlock: 0,
    summary: "Add neighbouring digits and place the sums between the outer digits.",
    steps: [
      "Take 52 × 11. Write the outer digits: 5 _ 2.",
      "The middle digit is 5 + 2 = 7.",
      "Answer: 572.",
      "If the middle sum is 10 or more, carry into the left digit: 87 × 11 → 8, (8+7)=15, 7 → 957.",
    ],
    drillRungIndex: 0, // "2x2" — already the easiest rung
  },
  {
    id: "left-to-right-add",
    name: "Left-to-right addition",
    operationKey: "add",
    minRungIndex: 3,
    ratingUnlock: 600,
    summary: "Add the biggest columns first so partial sums stay speakable in your head.",
    steps: [
      "For 4826 + 3179, start from the thousands: 4000 + 3000 = 7000.",
      "Hundreds: 800 + 100 = 900 → running total 7900.",
      "Tens: 20 + 70 = 90 → 7990.",
      "Units: 6 + 9 = 15 → 8005.",
      "You always hold ONE running number, not a trail of carries.",
    ],
    drillRungIndex: 1, // "3+3" — smallest pair where columns-first actually helps
  },
  {
    id: "vertically-crosswise",
    name: "Vertically and crosswise",
    operationKey: "mult",
    minRungIndex: 2, // 3x3 and beyond is method-dependent
    ratingUnlock: 700,
    summary: "The Vedic cross-multiplication pattern that scales to any digit count.",
    steps: [
      "Take 23 × 42.",
      "Vertical (left): 2 × 4 = 8.",
      "Crosswise: (2×2) + (3×4) = 4 + 12 = 16. Write 6, carry 1 → left becomes 9.",
      "Vertical (right): 3 × 2 = 6.",
      "Combine: 966.",
      "For 3x3, the pattern extends: 3 cross-products in the middle. Same idea at every size.",
    ],
    drillRungIndex: 0, // "2x2" — exactly the worked example (23 × 42)
  },
  {
    id: "base-method",
    name: "Base method (near 100/1000)",
    operationKey: "mult",
    minRungIndex: 4,
    ratingUnlock: 1000,
    summary: "Multiply numbers near a power of 10 using their small deviations.",
    steps: [
      "Take 97 × 96. Both are near base 100.",
      "Deviations: 97 → −3, 96 → −4.",
      "Left part: 97 + (−4) = 93 (cross-add either way, same result).",
      "Right part: (−3) × (−4) = 12.",
      "Answer: 9312.",
    ],
    drillRungIndex: 0, // "2x2" — base-100 pairs like 97 × 96, not 4x4
  },
  {
    id: "squares-ending-5",
    name: "Squaring numbers ending in 5",
    operationKey: "exp",
    minRungIndex: 0,
    ratingUnlock: 800,
    summary: "n5² = n(n+1) followed by 25.",
    steps: [
      "Take 65². The tens digit is 6.",
      "Compute 6 × 7 = 42.",
      "Append 25 → 4225.",
      "Works for any size: 115² → 11 × 12 = 132 → 13225.",
    ],
    drillRungIndex: 0, // "n²" 2-digit squares — already the easiest rung
  },
  {
    id: "complement-subtraction",
    name: "All from 9, last from 10",
    operationKey: "sub",
    minRungIndex: 2,
    ratingUnlock: 700,
    summary: "Subtract from round numbers using digit complements — no borrowing chains.",
    steps: [
      "Take 10000 − 4368.",
      "Each digit from 9, the last from 10: 9−4, 9−3, 9−6, 10−8.",
      "Answer: 5632. No borrowing at all.",
      "For general subtraction, round the subtrahend up, then add back the difference.",
    ],
    drillRungIndex: 0, // "2−2" — complements are learnable on two digits first
  },
  {
    id: "division-estimation",
    name: "Divisor rounding & correction",
    operationKey: "div",
    minRungIndex: 4, // "4÷2" — shifted by the new fine-grained "3÷2" rung
    ratingUnlock: 900,
    summary: "Round the divisor to a friendly number, divide, then correct the estimate.",
    steps: [
      "Take 4838 ÷ 22.",
      "Round divisor to 20: 4838 ÷ 20 ≈ 241.",
      "Because 22 is bigger than 20, the true quotient is slightly less — test 220: 22 × 220 = 4840. One too high.",
      "So 219 with remainder 20... check: 22 × 219 = 4818, remainder 20.",
      "Estimate → test → correct is the loop that scales to 10÷5 digits.",
    ],
    drillRungIndex: 3, // "3÷2" — the easiest rung with a roundable 2-digit divisor
  },
];

export function techniqueStatus(t: Technique, profile: Profile): TechniqueStatus {
  const explicit = profile.techniqueProgress[t.id];
  if (explicit === "completed" || explicit === "mastered") return explicit;
  const rating = profile.ratings[t.operationKey];
  return rating >= t.ratingUnlock ? "available" : "locked";
}

// Wrong-answer trigger: fires on EVERY relevant miss until the lesson is completed.
export function suggestionForMiss(
  op: string,
  rungIndex: number,
  profile: Profile
): Technique | null {
  const candidates = TECHNIQUES.filter(
    (t) =>
      t.operationKey === op &&
      rungIndex >= t.minRungIndex &&
      techniqueStatus(t, profile) === "available" // not locked, not yet completed
  );
  if (candidates.length === 0) return null;
  // most advanced relevant technique first
  candidates.sort((a, b) => b.minRungIndex - a.minRungIndex);
  return candidates[0];
}

// Rung-climb trigger: newly entered a method-dependent rung
export function suggestionForNewRung(
  op: string,
  prevRung: number,
  newRung: number,
  profile: Profile
): Technique | null {
  if (newRung <= prevRung) return null;
  const t = TECHNIQUES.find(
    (x) =>
      x.operationKey === op &&
      x.minRungIndex > prevRung &&
      x.minRungIndex <= newRung &&
      techniqueStatus(x, profile) === "available"
  );
  return t ?? null;
}
