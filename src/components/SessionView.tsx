"use client";

import { useState } from "react";

import { detectLang } from "@/lib/highlight";

import type { SessionSpec } from "./App";
import { CodeSlab } from "./CodeSlab";
import { FreeCard } from "./FreeCard";
import { McqCard } from "./McqCard";
import { RichText } from "./RichText";
import { SummaryView } from "./SummaryView";
import styles from "./SessionView.module.css";

interface SessionViewProps {
  session: SessionSpec;
  onScore: (domainId: string, questionId: string, score: number) => void;
  onExit: () => void;
}

const SEVERITY_CLASS: Record<string, string> = {
  Critical: styles.critical,
  Major: styles.major,
  Minor: styles.minor,
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function SessionView({ session, onScore, onExit }: SessionViewProps) {
  const [index, setIndex] = useState(0);
  // 未回答・とばした設問は null のまま。平均点の計算から除外される。
  const [scores, setScores] = useState<(number | null)[]>(() =>
    session.entries.map(() => null)
  );
  const [finished, setFinished] = useState(false);

  const total = session.entries.length;
  const entry = session.entries[index];
  const answeredCount = scores.filter((s) => s !== null).length;

  function handleScore(score: number) {
    setScores((current) => {
      const next = [...current];
      next[index] = score;
      return next;
    });
    onScore(entry.domain.id, entry.question.id, score);
  }

  function handleNext() {
    if (index + 1 >= total) {
      setFinished(true);
    } else {
      setIndex(index + 1);
      // 次の設問は上から読ませる
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    }
  }

  if (finished) {
    return <SummaryView session={session} scores={scores} onExit={onExit} />;
  }

  const { domain, question } = entry;

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <button type="button" className={styles.back} onClick={onExit}>
          ← 一覧
        </button>
        <p className={`mono ${styles.counter}`}>
          {pad(index + 1)} / {pad(total)}
        </p>
      </div>

      <div className={styles.progress} role="progressbar" aria-valuenow={answeredCount} aria-valuemin={0} aria-valuemax={total}>
        <div className={styles.progressFill} style={{ width: `${(answeredCount / total) * 100}%` }} />
      </div>

      <header className={styles.header}>
        <div className={styles.tags}>
          <span className={`mono ${styles.severity} ${SEVERITY_CLASS[question.severity]}`}>
            {question.severity}
          </span>
          <span className={`label ${styles.tagText}`}>{domain.name}</span>
          <span className={`label ${styles.tagText}`}>
            {question.type === "mcq" ? "四択" : "記述"}
          </span>
        </div>
      </header>

      <p className={styles.situation}>
        <RichText text={question.situation} />
      </p>

      {question.code ? (
        <CodeSlab
          code={question.code}
          lang={detectLang(question.code)}
          label={`${domain.id.toUpperCase()} / 対象コード`}
        />
      ) : null}

      <h2 className={styles.prompt}>
        <RichText text={question.prompt} />
      </h2>

      {question.type === "mcq" ? (
        <McqCard
          key={question.id}
          question={question}
          onScore={handleScore}
          onNext={handleNext}
          isLast={index + 1 >= total}
        />
      ) : (
        <FreeCard
          key={question.id}
          question={question}
          onScore={handleScore}
          onNext={handleNext}
          isLast={index + 1 >= total}
        />
      )}
    </main>
  );
}
