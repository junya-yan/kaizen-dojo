import styles from "./Stamp.module.css";

/**
 * 押印の演出。prefers-reduced-motion が有効な環境ではアニメーションを止める
 * （CSS 側のメディアクエリで無効化している）。
 */
export function Stamp({ passed }: { passed: boolean }) {
  return (
    <div className={`${styles.stamp} ${passed ? styles.pass : styles.fail}`} role="status">
      <span className={styles.main}>{passed ? "合格" : "要修正"}</span>
      <span className={styles.sub}>{passed ? "PASSED" : "NEEDS FIX"}</span>
    </div>
  );
}
