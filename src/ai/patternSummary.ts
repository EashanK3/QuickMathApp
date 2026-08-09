import { ErrorType, OperationKey, Profile } from "../types";
import { ERROR_LABELS } from "../questions";
import { OPERATION_META } from "../ladders";
import { OllamaConfig, ollamaGenerate } from "./ollamaClient";

const SYSTEM_PROMPT =
  "You are a friendly, encouraging mental-math coach reviewing a student's practice history. You're given " +
  "pre-computed statistics only — never invent numbers not given. Write a short summary (4-6 sentences): " +
  "which operation(s) they struggle with most, which mistake pattern recurs, and 1-2 concrete things to " +
  "practice next. Speak directly to the student as 'you'. No preamble, just the summary.";

interface OpStats {
  correct: number;
  total: number;
  errors: Map<ErrorType, number>;
}

// Exported separately from summarizePatterns so the Profile screen can show
// a plain-JS fallback ("here's your data") even when Ollama is unreachable.
export function buildPatternStats(profile: Profile): Map<string, OpStats> {
  const byOp = new Map<string, OpStats>();
  for (const h of profile.history) {
    const key = h.isVedic ? "vedic" : h.operationKey;
    const entry = byOp.get(key) ?? { correct: 0, total: 0, errors: new Map() };
    entry.correct += h.correctCount;
    entry.total += h.totalCount;
    for (const [type, count] of Object.entries(h.errorCounts)) {
      const t = type as ErrorType;
      entry.errors.set(t, (entry.errors.get(t) ?? 0) + (count ?? 0));
    }
    byOp.set(key, entry);
  }
  return byOp;
}

function statsToFacts(profile: Profile, byOp: Map<string, OpStats>): string {
  const lines: string[] = [`Total sessions played: ${profile.history.length}`];
  for (const [op, stats] of byOp.entries()) {
    const acc = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;
    const opName = op === "vedic" ? "Vedic technique drills" : OPERATION_META[op as OperationKey].name;
    const errorList =
      [...stats.errors.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => `${ERROR_LABELS[type]} x${count}`)
        .join(", ") || "none";
    lines.push(`- ${opName}: ${acc}% accuracy over ${stats.total} questions. Mistake types: ${errorList}.`);
  }
  return lines.join("\n");
}

export async function summarizePatterns(config: OllamaConfig, profile: Profile): Promise<string> {
  if (profile.history.length === 0) {
    return "Not enough practice history yet — play a few sessions first.";
  }
  const byOp = buildPatternStats(profile);
  const facts = statsToFacts(profile, byOp);
  return ollamaGenerate(config, facts, SYSTEM_PROMPT);
}
