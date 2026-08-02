import { OperationKey, Rung, WorldCupBenchmark } from "./types";
import { RATING_CEILING } from "./tiers";

// Each ladder terminates at its real Mental Calculation World Cup discipline.
// Subtraction and exponents have self-defined ceilings (no standalone WC discipline).

export const LADDERS: Record<OperationKey, Rung[]> = {
  mult: [
    { label: "2x2", description: "2-digit × 2-digit", parTimeSec: 12, leftDigits: 2, rightDigits: 2 },
    { label: "2x3", description: "2-digit × 3-digit", parTimeSec: 18, leftDigits: 2, rightDigits: 3 },
    { label: "3x3", description: "3-digit × 3-digit", parTimeSec: 30, leftDigits: 3, rightDigits: 3 },
    { label: "3x4", description: "3-digit × 4-digit", parTimeSec: 45, leftDigits: 3, rightDigits: 4 },
    { label: "4x4", description: "4-digit × 4-digit", parTimeSec: 70, leftDigits: 4, rightDigits: 4 },
    { label: "5x5", description: "5-digit × 5-digit", parTimeSec: 110, leftDigits: 5, rightDigits: 5 },
    { label: "6x6", description: "6-digit × 6-digit", parTimeSec: 170, leftDigits: 6, rightDigits: 6 },
    { label: "7x7", description: "7-digit × 7-digit", parTimeSec: 260, leftDigits: 7, rightDigits: 7 },
    { label: "8x8", description: "8-digit × 8-digit", parTimeSec: 380, leftDigits: 8, rightDigits: 8, isWorldCupDiscipline: true },
  ],
  add: [
    { label: "2+2", description: "2-digit + 2-digit", parTimeSec: 6, leftDigits: 2, operandCount: 2 },
    { label: "3+3", description: "3-digit + 3-digit", parTimeSec: 9, leftDigits: 3, operandCount: 2 },
    { label: "4+4", description: "4-digit + 4-digit", parTimeSec: 14, leftDigits: 4, operandCount: 2 },
    { label: "3×3d", description: "Sum of three 3-digit", parTimeSec: 18, leftDigits: 3, operandCount: 3 },
    { label: "3×5d", description: "Sum of three 5-digit", parTimeSec: 30, leftDigits: 5, operandCount: 3 },
    { label: "5×5d", description: "Sum of five 5-digit", parTimeSec: 50, leftDigits: 5, operandCount: 5 },
    { label: "5×7d", description: "Sum of five 7-digit", parTimeSec: 80, leftDigits: 7, operandCount: 5 },
    { label: "10×7d", description: "Sum of ten 7-digit", parTimeSec: 140, leftDigits: 7, operandCount: 10 },
    { label: "10×8d", description: "Sum of ten 8-digit", parTimeSec: 190, leftDigits: 8, operandCount: 10 },
    { label: "10×10d", description: "Sum of ten 10-digit", parTimeSec: 250, leftDigits: 10, operandCount: 10, isWorldCupDiscipline: true },
  ],
  div: [
    { label: "2÷1", description: "2-digit ÷ 1-digit, clean", parTimeSec: 6, leftDigits: 2, rightDigits: 1 },
    { label: "3÷1", description: "3-digit ÷ 1-digit, clean", parTimeSec: 10, leftDigits: 3, rightDigits: 1 },
    { label: "3÷1r", description: "3-digit ÷ 1-digit, remainder", parTimeSec: 14, leftDigits: 3, rightDigits: 1, withRemainder: true },
    { label: "4÷2", description: "4-digit ÷ 2-digit", parTimeSec: 25, leftDigits: 4, rightDigits: 2 },
    { label: "5÷2", description: "5-digit ÷ 2-digit", parTimeSec: 40, leftDigits: 5, rightDigits: 2 },
    { label: "6÷3", description: "6-digit ÷ 3-digit", parTimeSec: 65, leftDigits: 6, rightDigits: 3 },
    { label: "7÷3", description: "7-digit ÷ 3-digit", parTimeSec: 95, leftDigits: 7, rightDigits: 3 },
    { label: "8÷4", description: "8-digit ÷ 4-digit", parTimeSec: 140, leftDigits: 8, rightDigits: 4 },
    { label: "9÷4", description: "9-digit ÷ 4-digit", parTimeSec: 190, leftDigits: 9, rightDigits: 4 },
    { label: "10÷5", description: "10-digit ÷ 5-digit", parTimeSec: 250, leftDigits: 10, rightDigits: 5, isWorldCupDiscipline: true },
  ],
  sub: [
    { label: "2−2", description: "2-digit − 2-digit", parTimeSec: 6, leftDigits: 2, rightDigits: 2 },
    { label: "3−3", description: "3-digit − 3-digit", parTimeSec: 10, leftDigits: 3, rightDigits: 3 },
    { label: "4−4", description: "4-digit − 4-digit", parTimeSec: 16, leftDigits: 4, rightDigits: 4 },
    { label: "5−5", description: "5-digit − 5-digit", parTimeSec: 26, leftDigits: 5, rightDigits: 5 },
    { label: "6−6", description: "6-digit − 6-digit", parTimeSec: 40, leftDigits: 6, rightDigits: 6 },
  ],
  sqrt: [
    { label: "√perfect", description: "Perfect squares to 4 digits", parTimeSec: 8, leftDigits: 4 },
    { label: "√3d", description: "3-digit roots, 1 decimal", parTimeSec: 30, leftDigits: 3 },
    { label: "√4d", description: "4-digit roots, 2 decimals", parTimeSec: 60, leftDigits: 4 },
    { label: "√5d", description: "5-digit roots, 3 decimals", parTimeSec: 110, leftDigits: 5 },
    { label: "√6d", description: "6-digit roots, 5 decimals", parTimeSec: 180, leftDigits: 6, isWorldCupDiscipline: true },
  ],
  exp: [
    { label: "n²", description: "Squares of 2-digit numbers", parTimeSec: 8, leftDigits: 2 },
    { label: "n³ (1d)", description: "Cubes of 1-digit numbers", parTimeSec: 5, leftDigits: 1 },
    { label: "n² (3d)", description: "Squares of 3-digit numbers", parTimeSec: 30, leftDigits: 3 },
    { label: "n³ (2d)", description: "Cubes of 2-digit numbers", parTimeSec: 45, leftDigits: 2 },
  ],
};

// Approximate world-record paces from Mental Calculation World Cup results.
// Purely a reference anchor — shown ONLY when practicing the true discipline rung.
export const WORLD_CUP_BENCHMARKS: WorldCupBenchmark[] = [
  { operationKey: "add",  disciplineName: "Adding ten 10-digit numbers",            recordPaceSec: 7.8,  recordHolderNote: "≈78s for 10 tasks (Aaryan Shukla, 2024)" },
  { operationKey: "mult", disciplineName: "Multiplying two 8-digit numbers",        recordPaceSec: 30,   recordHolderNote: "≈4:56 for 10 tasks (world record pace)" },
  { operationKey: "div",  disciplineName: "10-digit ÷ 5-digit division",            recordPaceSec: 4.2,  recordHolderNote: "≈42s for 10 tasks (Aaryan Shukla)" },
  { operationKey: "sqrt", disciplineName: "Square roots of 6-digit numbers",        recordPaceSec: 41,   recordHolderNote: "elite pace, 8 significant digits" },
];

export function benchmarkFor(op: OperationKey, rungIndex: number) {
  const rung = LADDERS[op][rungIndex];
  if (!rung?.isWorldCupDiscipline) return null;
  return WORLD_CUP_BENCHMARKS.find((b) => b.operationKey === op) ?? null;
}

// Rating → rung: rungs are spread evenly across 0..RATING_CEILING
export function rungIndexForRating(op: OperationKey, rating: number): number {
  const rungs = LADDERS[op];
  const band = RATING_CEILING / rungs.length;
  return Math.min(rungs.length - 1, Math.max(0, Math.floor(rating / band)));
}

export const OPERATION_META: Record<OperationKey, { name: string; symbol: string }> = {
  add: { name: "Addition", symbol: "+" },
  sub: { name: "Subtraction", symbol: "−" },
  mult: { name: "Multiplication", symbol: "×" },
  div: { name: "Division", symbol: "÷" },
  sqrt: { name: "Square roots", symbol: "√" },
  exp: { name: "Exponents", symbol: "xⁿ" },
};
