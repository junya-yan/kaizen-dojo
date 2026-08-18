/**
 * 進捗の永続化層。
 *
 * 現状はブラウザの localStorage に閉じている（アカウント不要・個人の学習ログ）。
 * 複数端末で共有したくなった時に、この `ProgressStore` を実装した
 * サーバー版に差し替えられるよう、読み書きの入口をここだけに絞っている。
 * 呼び出し側は localStorage を直接触らない。
 */

export const PROGRESS_STORAGE_KEY = "kenpin:progress:v1";

/** { [domainId]: { [questionId]: score } } */
export type Progress = Record<string, Record<string, number>>;

export interface ProgressStore {
  load(): Promise<Progress>;
  save(progress: Progress): Promise<void>;
  clear(): Promise<void>;
}

function isProgressShape(value: unknown): value is Progress {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every(
    (scores) =>
      typeof scores === "object" &&
      scores !== null &&
      !Array.isArray(scores) &&
      Object.values(scores).every((score) => typeof score === "number")
  );
}

/** サーバーレンダリング時やストレージが使えない環境向けのフォールバック */
class MemoryProgressStore implements ProgressStore {
  private progress: Progress = {};

  async load(): Promise<Progress> {
    return this.progress;
  }

  async save(progress: Progress): Promise<void> {
    this.progress = progress;
  }

  async clear(): Promise<void> {
    this.progress = {};
  }
}

class LocalStorageProgressStore implements ProgressStore {
  private readonly key: string;

  constructor(key: string) {
    this.key = key;
  }

  async load(): Promise<Progress> {
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return {};
      const parsed: unknown = JSON.parse(raw);
      // 壊れた値が入っていても演習は続けられるようにする（空として扱う）
      return isProgressShape(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  async save(progress: Progress): Promise<void> {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(progress));
    } catch {
      // プライベートブラウジングや容量超過で書けないことがある。
      // 保存できなくても演習そのものは続行できる状態を保つ。
    }
  }

  async clear(): Promise<void> {
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      // 同上
    }
  }
}

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const probe = "__kenpin_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

let store: ProgressStore | null = null;

export function getProgressStore(): ProgressStore {
  if (!store) {
    store = isLocalStorageAvailable()
      ? new LocalStorageProgressStore(PROGRESS_STORAGE_KEY)
      : new MemoryProgressStore();
  }
  return store;
}

/** テストや、将来サーバー版へ差し替えるときの差し込み口 */
export function setProgressStore(next: ProgressStore): void {
  store = next;
}

export function recordScore(
  progress: Progress,
  domainId: string,
  questionId: string,
  score: number
): Progress {
  return {
    ...progress,
    [domainId]: { ...(progress[domainId] ?? {}), [questionId]: score },
  };
}

export function answeredCount(progress: Progress, domainId: string): number {
  return Object.keys(progress[domainId] ?? {}).length;
}

export function totalAnsweredCount(progress: Progress): number {
  return Object.values(progress).reduce((sum, scores) => sum + Object.keys(scores).length, 0);
}

/** そのドメインの平均点。1問も答えていなければ null */
export function domainAverage(progress: Progress, domainId: string): number | null {
  const scores = Object.values(progress[domainId] ?? {});
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
