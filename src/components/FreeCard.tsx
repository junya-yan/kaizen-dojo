"use client";

import { useState } from "react";

import type { FreeQuestion } from "@/data/types";
import {
  MAX_ANSWER_LENGTH,
  MIN_ANSWER_LENGTH,
  PARTIAL_SCORE,
  PASS_SCORE,
  type GradeErrorBody,
  type GradeResult,
} from "@/lib/grading";

import { FixBlock } from "./FixBlock";
import { RichText } from "./RichText";
import styles from "./FreeCard.module.css";

interface FreeCardProps {
  question: FreeQuestion;
  /** 採点された場合のみ呼ぶ。とばした場合は記録しない */
  onScore: (score: number) => void;
  onNext: () => void;
  isLast: boolean;
}

type Phase = "writing" | "grading" | "graded" | "selfCheck";

function scoreColor(score: number): string {
  if (score >= PASS_SCORE) return "var(--stamp-green)";
  if (score >= PARTIAL_SCORE) return "var(--stamp-amber)";
  return "var(--stamp-red)";
}

export function FreeCard({ question, onScore, onNext, isLast }: FreeCardProps) {
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<Phase>("writing");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rubricOpen, setRubricOpen] = useState(false);

  const tooShort = answer.trim().length < MIN_ANSWER_LENGTH;

  async function grade() {
    setPhase("grading");
    setError(null);

    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, answer: answer.trim() }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as GradeErrorBody | null;
        throw new Error(body?.message ?? "採点に失敗しました。");
      }

      const graded = (await res.json()) as GradeResult;
      setResult(graded);
      setPhase("graded");
      onScore(graded.score);
    } catch (e) {
      setError(e instanceof Error ? e.message : "採点に失敗しました。");
      setPhase("writing");
    }
  }

  const showRubricAndFix = phase === "graded" || phase === "selfCheck";

  return (
    <div className={styles.card}>
      {phase === "writing" || phase === "grading" ? (
        <>
          <label className={`label ${styles.inputLabel}`} htmlFor={`answer-${question.id}`}>
            回答欄
          </label>
          <textarea
            id={`answer-${question.id}`}
            className={styles.textarea}
            rows={10}
            maxLength={MAX_ANSWER_LENGTH}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={phase === "grading"}
            placeholder={
              "何がリスクなのか / なぜそれが問題なのか / どう直すのか、の順で書くと観点が漏れにくくなります。\n" +
              "思いついた指摘を並べるだけでなく、影響の大きい順に並べてみてください。"
            }
          />

          <div className={styles.meta}>
            <span className="mono">
              {answer.length} 字{tooShort ? `（${MIN_ANSWER_LENGTH}字以上で採点できます）` : ""}
            </span>
          </div>

          {error ? (
            <div className={styles.error} role="alert">
              <p className={styles.errorText}>{error}</p>
              <button
                type="button"
                className={styles.ghost}
                onClick={() => {
                  setError(null);
                  setPhase("selfCheck");
                }}
              >
                採点基準を見る（自己採点）
              </button>
            </div>
          ) : null}

          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={onNext}>
              とばす
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={grade}
              disabled={tooShort || phase === "grading"}
            >
              {phase === "grading" ? "採点中…" : "採点してもらう"}
            </button>
          </div>
        </>
      ) : null}

      {phase === "graded" && result ? (
        <div className={styles.result}>
          <div className={styles.scoreRow}>
            <div>
              <p className="label">採点結果</p>
              <p className={`mono ${styles.score}`} style={{ color: scoreColor(result.score) }}>
                {result.score}
                <span className={styles.scoreUnit}>/ 100</span>
              </p>
            </div>
            <p
              className={styles.verdict}
              style={{
                color: result.verdict === "合格" ? "var(--stamp-green)" : "var(--stamp-red)",
                borderColor: result.verdict === "合格" ? "var(--stamp-green)" : "var(--stamp-red)",
              }}
            >
              {result.verdict}
            </p>
          </div>

          <div className={styles.bar}>
            <div
              className={styles.barFill}
              style={{ width: `${result.score}%`, background: scoreColor(result.score) }}
            />
          </div>

          <p className={styles.comment}>
            <RichText text={result.comment} />
          </p>

          {result.covered.length > 0 ? (
            <section className={styles.section}>
              <p className={`label ${styles.covered}`}>押さえていた点</p>
              <ul className={styles.list}>
                {result.covered.map((item, i) => (
                  <li key={i}>
                    <RichText text={item} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {result.missed.length > 0 ? (
            <section className={styles.section}>
              <p className={`label ${styles.missed}`}>抜けていた点</p>
              <ul className={styles.list}>
                {result.missed.map((item, i) => (
                  <li key={i}>
                    <RichText text={item} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className={styles.nextStep}>
            <p className="label">次の一歩</p>
            <p className={styles.nextStepText}>
              <RichText text={result.nextStep} />
            </p>
          </div>
        </div>
      ) : null}

      {showRubricAndFix ? (
        <>
          {phase === "selfCheck" ? (
            <p className={styles.selfCheckNote}>
              採点は行われていません。下の採点基準と模範解答に照らして、自分の回答を確認してください。
            </p>
          ) : null}

          <details
            className={styles.rubric}
            open={rubricOpen || phase === "selfCheck"}
            onToggle={(e) => setRubricOpen((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary className={styles.rubricSummary}>
              <span className="label">採点基準（模範解答の観点）</span>
            </summary>
            <ul className={styles.list}>
              {question.rubric.map((item, i) => (
                <li key={i}>
                  <RichText text={item} />
                </li>
              ))}
            </ul>
          </details>

          <FixBlock questionId={question.id} />

          <div className={styles.actions}>
            <button type="button" className={styles.next} onClick={onNext}>
              {isLast ? "検査を終える" : "次へ"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
