import { OperationKey, QuestionResult, Rung } from "../types";
import { ERROR_LABELS } from "../questions";
import { OPERATION_META } from "../ladders";
import { OllamaConfig, ollamaGenerate } from "./ollamaClient";

// Deliberately NEVER given the actual numbers or answers. Early testing
// showed that handing a 1-3B local model the real digits made it invent
// specific (and wrong) claims like "you added the tens digit twice" — a
// confident-sounding fabrication with nothing behind it. Stripped down to
// just the mistake TYPE + problem shape + pace, the model stays honest and
// gives genuinely useful generic coaching instead. It never does arithmetic
// itself — the mistake type already came from the app's own deterministic
// classifyError() in questions.ts.
const SYSTEM_PROMPT =
  "You are a friendly, encouraging mental-math coach. You are given only the CATEGORY of a missed " +
  "question — never the actual numbers, because you were not shown the student's work and must not " +
  "invent specifics. Given the operation, the problem size, the diagnosed mistake type (timeout / " +
  "carry-or-borrow slip / near-miss digit slip / method breakdown), and the time taken vs the expected " +
  "pace, write a SHORT (2-3 sentence) encouraging explanation of what that TYPE of mistake generally " +
  "means and one concrete generic tip to avoid it. Speak directly to the student as 'you'. No preamble, " +
  "just the explanation.";

export async function explainMistake(
  config: OllamaConfig,
  operationKey: OperationKey,
  rung: Rung,
  result: QuestionResult
): Promise<string> {
  const seconds = (result.timeTakenMs / 1000).toFixed(1);
  const facts = [
    `Operation: ${OPERATION_META[operationKey].name}`,
    `Problem size: ${rung.description}`,
    `Diagnosed mistake type: ${ERROR_LABELS[result.errorType]}`,
    `Time taken: ${seconds}s (expected pace: about ${rung.parTimeSec}s)`,
  ].join("\n");

  return ollamaGenerate(config, facts, SYSTEM_PROMPT);
}
