import { Fragment } from "react";

import styles from "./RichText.module.css";

/**
 * 設問やAIの採点コメントには `identifier` のようなバッククォート記法が混ざる。
 * Markdown全体を解釈する必要はないので、インラインコードだけを等幅で描画する。
 */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/g);

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code className={styles.code} key={i}>
            {part}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}
