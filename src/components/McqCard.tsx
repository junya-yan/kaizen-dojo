"use client";

import { useState } from "react";

import type { McqQuestion } from "@/data/types";

import { FixBlock } from "./FixBlock";
import { RichText } from "./RichText";
import { Stamp } from "./Stamp";
import styles from "./McqCard.module.css";

const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F"];

interface McqCardProps {
  question: McqQuestion;
  /** 選択の結果（正解=100 / 不正解=0）を記録する */
  onScore: (score: number) => void;
  onNext: () => void;
  isLast: boolean;
}

export function McqCard({ question, onScore, onNext, isLast }: McqCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const correct = selected === question.answer;

  function choose(index: number) {
    // 1回勝負。選択後は変更できない
    if (answered) return;
    setSelected(index);
    onScore(index === question.answer ? 100 : 0);
  }

  return (
    <div className={styles.card}>
      <ul className={styles.choices}>
        {question.choices.map((choice, index) => {
          const isAnswer = index === question.answer;
          const isWrongPick = answered && index === selected && !isAnswer;
          const state = answered && isAnswer ? styles.correct : isWrongPick ? styles.wrong : "";

          return (
            <li key={index}>
              <button
                type="button"
                className={`${styles.choice} ${state}`}
                onClick={() => choose(index)}
                disabled={answered}
                aria-pressed={selected === index}
              >
                <span className={`mono ${styles.letter}`}>{CHOICE_LETTERS[index]}</span>
                <span className={styles.choiceText}>
                  <RichText text={choice} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {answered ? (
        <div className={styles.result}>
          <div className={styles.stampRow}>
            <Stamp passed={correct} />
          </div>

          <p className={styles.explanation}>
            <RichText text={question.explanation} />
          </p>

          <div className={styles.principle}>
            <p className="label">原則</p>
            <p className={styles.principleText}>
              <RichText text={question.principle} />
            </p>
          </div>

          <FixBlock questionId={question.id} />

          <div className={styles.actions}>
            <button type="button" className={styles.next} onClick={onNext}>
              {isLast ? "検査を終える" : "次へ"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
