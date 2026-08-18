import { tokenize, type HighlightLang } from "@/lib/highlight";

import styles from "./CodeSlab.module.css";

interface CodeSlabProps {
  code: string;
  lang?: HighlightLang;
  /** ヘッダ左のラベル。例: "REVIEW / 対象コード" */
  label: string;
  /** ヘッダ右の補助ラベル。例: "SQL" */
  badge?: string;
  /** 模範解答など、合格色のヘッダにしたい場合 */
  accent?: "default" | "pass";
}

export function CodeSlab({ code, lang = "js", label, badge, accent = "default" }: CodeSlabProps) {
  const lines = tokenize(code.replace(/\n+$/, ""), lang);
  // border-box なので、左右のパディングぶんを幅に含めておかないと行番号が桁あふれする
  const gutterWidth = `calc(${String(lines.length).length}ch + 26px)`;

  return (
    <figure className={styles.slab}>
      <figcaption
        className={`${styles.header} ${accent === "pass" ? styles.headerPass : ""}`}
      >
        <span className="label">{label}</span>
        {badge ? <span className={styles.badge}>{badge}</span> : null}
      </figcaption>

      <div className={styles.scroller}>
        <pre className={styles.pre}>
          <code>
            {lines.map((tokens, index) => (
              <span className={styles.line} key={index}>
                <span className={styles.lineNo} style={{ width: gutterWidth }} aria-hidden="true">
                  {index + 1}
                </span>
                <span className={styles.lineBody}>
                  {tokens.length === 0 ? "\n" : null}
                  {tokens.map((token, i) => (
                    <span className={styles[token.kind]} key={i}>
                      {token.value}
                    </span>
                  ))}
                  {"\n"}
                </span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </figure>
  );
}
