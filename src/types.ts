export type OperationKey = "add" | "sub" | "mult" | "div" | "sqrt" | "exp";

export type ErrorType = "timeout" | "carry" | "near_miss" | "method" | "none";

export interface Rung {
  label: string;          // e.g. "4x4"
  description: string;    // e.g. "4-digit x 4-digit"
  parTimeSec: number;     // expected solve time used by the rating engine
  // question generation params
  leftDigits: number;
  rightDigits?: number;
  operandCount?: number;  // for multi-number addition rungs
  withRemainder?: boolean;
  isWorldCupDiscipline?: boolean;
}

export interface WorldCupBenchmark {
  operationKey: OperationKey;
  disciplineName: string;
  recordPaceSec: number; // approx seconds per task at world-record pace
  recordHolderNote: string;
}

export interface TierDef {
  name: string;
  icon: string;
  floor: number; // MMR floor (inclusive)
}

export type TechniqueStatus = "locked" | "available" | "completed" | "mastered";

export interface Technique {
  id: string;
  name: string;
  operationKey: OperationKey;
  minRungIndex: number;      // rung at which this becomes relevant / suggested
  ratingUnlock: number;      // rating-gated, NOT sequential-gated
  summary: string;
  steps: string[];
  drillRungIndex: number;    // which rung the inline drill uses
}

export interface QuestionResult {
  prompt: string;
  correctAnswer: number;
  userAnswer: number | null;
  timeTakenMs: number;
  isCorrect: boolean;
  errorType: ErrorType;
}

export interface SessionSummary {
  operationKey: OperationKey;
  rungIndex: number;
  results: QuestionResult[];
  ratingBefore: number;
  ratingAfter: number;
  promoted: boolean;
  demoted: boolean;
  isVedic: boolean;
  suggestedTechniqueId: string | null;
}

export interface Profile {
  ratings: Record<OperationKey, number>;
  vedicRating: number;
  // promotion shield state, per rating key ("add".."exp" or "vedic")
  shields: Record<string, { remaining: number; tierFloor: number } | null>;
  techniqueProgress: Record<string, TechniqueStatus>;
  streakCount: number;
  lastPracticeDay: string | null;
}

export const DEFAULT_PROFILE: Profile = {
  ratings: { add: 400, sub: 400, mult: 400, div: 400, sqrt: 400, exp: 400 },
  vedicRating: 400,
  shields: {},
  techniqueProgress: {},
  streakCount: 0,
  lastPracticeDay: null,
};
