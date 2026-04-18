"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Operator = "+" | "-" | "×";

interface MathProblem {
  question: string;
  answer: number;
}

interface MathCaptchaProps {
  onVerified: () => void;
  maxAttempts?: number;
}

function generateProblem(): MathProblem {
  const ops: Operator[] = ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  switch (op) {
    case "+":
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * 50) + 10;
      answer = a + b;
      break;
    case "-":
      a = Math.floor(Math.random() * 50) + 30;
      b = Math.floor(Math.random() * 30) + 1;
      answer = a - b;
      break;
    case "×":
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      answer = a * b;
      break;
  }

  return { question: `${a} ${op} ${b} = ?`, answer };
}

export function MathCaptcha({ onVerified, maxAttempts = 5 }: MathCaptchaProps) {
  const [problem, setProblem] = useState<MathProblem>(generateProblem);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const refresh = useCallback(() => {
    setProblem(generateProblem());
    setInput("");
    setError(false);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked || !input.trim()) return;

    if (parseInt(input, 10) === problem.answer) {
      onVerified();
      return;
    }

    const next = attempts + 1;
    setAttempts(next);
    setError(true);
    setInput("");

    if (next >= maxAttempts) {
      setLocked(true);
    } else {
      inputRef.current?.focus();
    }
  }

  function handleReset() {
    setAttempts(0);
    setLocked(false);
    refresh();
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const remaining = maxAttempts - attempts;

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-700/50">
        <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
          {problem.question}
        </p>
      </div>

      {locked ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-red-500">
            已超過嘗試次數上限，請重新開始
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            重新開始
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={inputRef}
            type="number"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
            }}
            placeholder="輸入答案"
            className={`w-full rounded-lg border px-4 py-3 text-center font-mono text-xl tracking-wider transition-colors
              focus:outline-none focus:ring-2 focus:ring-sky-500
              ${
                error
                  ? "border-red-400 bg-red-50 text-red-600 dark:border-red-600 dark:bg-red-900/20"
                  : "border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              }`}
          />

          {error && (
            <p className="text-center text-sm text-red-500">
              答案錯誤，請重試（剩餘 {remaining} 次）
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={refresh}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              換一題
            </button>
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              驗證
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
