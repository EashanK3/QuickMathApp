import { OperationKey, Rung, ErrorType } from "./types";

function randNDigits(n: number): number {
  const min = n === 1 ? 2 : Math.pow(10, n - 1);
  const max = Math.pow(10, n) - 1;
  return Math.floor(min + Math.random() * (max - min + 1));
}

export interface GeneratedQuestion {
  prompt: string;
  answer: number;
  operands: number[];
}

export function generateQuestion(op: OperationKey, rung: Rung): GeneratedQuestion {
  switch (op) {
    case "add": {
      const count = rung.operandCount ?? 2;
      const ops = Array.from({ length: count }, () => randNDigits(rung.leftDigits));
      return {
        prompt: ops.join(" + "),
        answer: ops.reduce((a, b) => a + b, 0),
        operands: ops,
      };
    }
    case "sub": {
      let a = randNDigits(rung.leftDigits);
      let b = randNDigits(rung.rightDigits ?? rung.leftDigits);
      if (b > a) [a, b] = [b, a];
      return { prompt: `${a} − ${b}`, answer: a - b, operands: [a, b] };
    }
    case "mult": {
      const a = randNDigits(rung.leftDigits);
      const b = randNDigits(rung.rightDigits ?? rung.leftDigits);
      return { prompt: `${a} × ${b}`, answer: a * b, operands: [a, b] };
    }
    case "div": {
      const divisor = randNDigits(rung.rightDigits ?? 1);
      const quotient = randNDigits(Math.max(1, rung.leftDigits - (rung.rightDigits ?? 1)));
      if (rung.withRemainder) {
        const remainder = 1 + Math.floor(Math.random() * (divisor - 1));
        const dividend = divisor * quotient + remainder;
        // answer format: quotient only (remainder shown separately would need 2 inputs;
        // ask for the quotient, integer part)
        return {
          prompt: `${dividend} ÷ ${divisor}  (quotient only)`,
          answer: quotient,
          operands: [dividend, divisor],
        };
      }
      const dividend = divisor * quotient;
      return { prompt: `${dividend} ÷ ${divisor}`, answer: quotient, operands: [dividend, divisor] };
    }
    case "sqrt": {
      if (rung.label === "√perfect") {
        const root = randNDigits(2);
        return { prompt: `√${root * root}`, answer: root, operands: [root * root] };
      }
      // integer-root approximation rungs: ask for the integer part of the root
      const n = randNDigits(rung.leftDigits);
      return {
        prompt: `√${n}  (integer part)`,
        answer: Math.floor(Math.sqrt(n)),
        operands: [n],
      };
    }
    case "exp": {
      if (rung.label.startsWith("n³")) {
        const a = randNDigits(rung.leftDigits);
        return { prompt: `${a}³`, answer: a * a * a, operands: [a] };
      }
      const a = randNDigits(rung.leftDigits);
      return { prompt: `${a}²`, answer: a * a, operands: [a] };
    }
  }
}

// Lightweight diagnosis of WHERE a miss went wrong.
export function classifyError(userAnswer: number | null, correct: number, timedOut: boolean): ErrorType {
  if (timedOut || userAnswer === null) return "timeout";
  const diff = Math.abs(userAnswer - correct);
  if (diff === 0) return "none";
  // Off by a clean power of ten multiple → likely a carry/borrow slip
  if (diff % 10 === 0 && diff <= correct * 0.2) return "carry";
  // Close in magnitude → a digit slip / near miss
  if (diff <= Math.max(9, correct * 0.02)) return "near_miss";
  return "method";
}

export const ERROR_LABELS: Record<ErrorType, string> = {
  timeout: "Ran out of time",
  carry: "Carry / borrow slip",
  near_miss: "Near miss (digit slip)",
  method: "Method breakdown",
  none: "",
};
