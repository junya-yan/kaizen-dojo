import { getFix } from "@/data";

import { CodeSlab } from "./CodeSlab";
import { RichText } from "./RichText";
import styles from "./FixBlock.module.css";

const LANG_LABEL: Record<string, string> = { js: "JS", sql: "SQL", bash: "SHELL" };

/**
 * 模範解答ブロック。該当する模範解答が無い設問では何も描画しない（無音でスキップ）。
 */
export function FixBlock({ questionId }: { questionId: string }) {
  const fix = getFix(questionId);
  if (!fix) return null;

  return (
    <section className={styles.block}>
      <h4 className={styles.heading}>
        <span className="label">模範解答 / 修正後のコード</span>
      </h4>

      <CodeSlab
        code={fix.code}
        lang={fix.lang}
        label="FIXED"
        badge={LANG_LABEL[fix.lang] ?? fix.lang.toUpperCase()}
        accent="pass"
      />

      <p className={`label ${styles.notesLabel}`}>変更点</p>
      <ul className={styles.notes}>
        {fix.notes.map((note, i) => (
          <li key={i}>
            <RichText text={note} />
          </li>
        ))}
      </ul>
    </section>
  );
}
