"use client";

import { useState } from "react";

import { TOTAL_QUESTION_COUNT, type Domain } from "@/data";
import { domainAverage, totalAnsweredCount, type Progress } from "@/lib/storage";

import { SPOT_CHECK_COUNT } from "./App";
import styles from "./HomeView.module.css";

interface HomeViewProps {
  domains: Domain[];
  progress: Progress;
  /** 進捗の読み込みが終わるまで、検印数のちらつきを避けるために使う */
  loaded: boolean;
  onStartDomain: (domain: Domain) => void;
  onStartSpotCheck: () => void;
  onReset: () => void;
}

export function HomeView({
  domains,
  progress,
  loaded,
  onStartDomain,
  onStartSpotCheck,
  onReset,
}: HomeViewProps) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const answered = totalAnsweredCount(progress);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className="label">QUALITY INSPECTION DRILL</p>
        <h1 className={styles.title}>「動く」を「安心して使える」に変える</h1>
        <p className={styles.lead}>
          ここに出てくるコードは、すべてテストが通り、手元では正しく動いています。
          探すのはバグではなく、まだ表に出ていないリスクです。
          AIがコードを書けるようになったいま、生成されたコードを審査して責任を持てることが、
          開発者の決定的な差になります。
        </p>
      </header>

      <section>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>検査項目</h2>
          <p className={`mono ${styles.stampCount}`}>
            検印 {loaded ? answered : "—"} / {TOTAL_QUESTION_COUNT}
          </p>
        </div>

        <ul className={styles.domains}>
          {domains.map((domain) => {
            const average = domainAverage(progress, domain.id);
            const scores = progress[domain.id] ?? {};

            return (
              <li key={domain.id}>
                <button
                  type="button"
                  className={styles.domainRow}
                  onClick={() => onStartDomain(domain)}
                >
                  <span className={`mono ${styles.domainNo}`}>{domain.no}</span>

                  <span className={styles.domainBody}>
                    <span className={styles.domainName}>{domain.name}</span>
                    <span className={styles.domainLead}>{domain.lead}</span>
                  </span>

                  <span className={styles.domainMeta}>
                    <span className={styles.dots} aria-hidden="true">
                      {domain.questions.map((q) => (
                        <span
                          key={q.id}
                          className={`${styles.dot} ${q.id in scores ? styles.dotFilled : ""}`}
                        />
                      ))}
                    </span>
                    <span className={`mono ${styles.average}`}>
                      {average === null ? "未検査" : `平均 ${average}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.tools}>
        <button type="button" className={styles.spotCheck} onClick={onStartSpotCheck}>
          抜き打ち検査（全分野から{SPOT_CHECK_COUNT}問）
        </button>

        {answered > 0 ? (
          confirmingReset ? (
            <div className={styles.confirm} role="alertdialog" aria-label="検印の消去">
              <p className={styles.confirmText}>
                {answered}件の検印をすべて消します。元には戻せません。
              </p>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className={styles.confirmCancel}
                  onClick={() => setConfirmingReset(false)}
                >
                  やめる
                </button>
                <button
                  type="button"
                  className={styles.confirmOk}
                  onClick={() => {
                    onReset();
                    setConfirmingReset(false);
                  }}
                >
                  消す
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={styles.reset}
              onClick={() => setConfirmingReset(true)}
            >
              検印を消す
            </button>
          )
        ) : null}
      </section>

      <footer className={styles.footer}>
        <p className={styles.footerNote}>
          記述式の回答はAIが採点基準に照らして採点します。点数そのものより、
          抜けていた観点のほうが持ち帰る価値があります。
        </p>
      </footer>
    </main>
  );
}
