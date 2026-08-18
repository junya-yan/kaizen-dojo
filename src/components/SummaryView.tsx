"use client";

import { PARTIAL_SCORE, PASS_SCORE } from "@/lib/grading";

import type { SessionSpec } from "./App";
import styles from "./SummaryView.module.css";

interface SummaryViewProps {
  session: SessionSpec;
  /** 未回答・とばした設問は null */
  scores: (number | null)[];
  onExit: () => void;
}

function scoreClass(score: number): string {
  if (score >= PASS_SCORE) return styles.pass;
  if (score >= PARTIAL_SCORE) return styles.partial;
  return styles.fail;
}

export function SummaryView({ session, scores, onExit }: SummaryViewProps) {
  // 未回答は平均から除外する。答えていない設問を0点として混ぜない。
  const graded = scores.filter((s): s is number => s !== null);
  const average =
    graded.length === 0 ? null : Math.round(graded.reduce((a, b) => a + b, 0) / graded.length);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className="label">INSPECTION COMPLETE</p>
        <h1 className={styles.title}>検査完了</h1>
        <p className={styles.subtitle}>{session.title}</p>
      </header>

      <section className={styles.averageBlock}>
        <p className="label">平均点</p>
        {average === null ? (
          <p className={styles.noScore}>採点された設問がありません</p>
        ) : (
          <p className={`mono ${styles.average} ${scoreClass(average)}`}>
            {average}
            <span className={styles.averageUnit}>/ 100</span>
          </p>
        )}
        <p className={styles.averageNote}>
          採点対象 {graded.length} / {session.entries.length} 問（とばした設問は平均に含めていません）
        </p>
      </section>

      <ul className={styles.list}>
        {session.entries.map((entry, i) => {
          const score = scores[i];
          return (
            <li key={entry.question.id} className={styles.row}>
              <span className={`mono ${styles.rowNo}`}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.rowText}>{entry.question.prompt.replace(/`/g, "")}</span>
              <span
                className={`mono ${styles.rowScore} ${score === null ? styles.skipped : scoreClass(score)}`}
              >
                {score === null ? "—" : score}
              </span>
            </li>
          );
        })}
      </ul>

      <button type="button" className={styles.exit} onClick={onExit}>
        検査項目一覧へ戻る
      </button>
    </main>
  );
}
