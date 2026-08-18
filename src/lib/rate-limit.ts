/**
 * 採点APIのレート制限。
 *
 * 単一プロセスのメモリ上で数えるだけの実装なので、複数インスタンスに水平分割した場合は
 * インスタンスごとの制限になる。台数を増やす段階では Redis などの共有ストアに差し替える
 * （このモジュールのインターフェースはそのまま使える）。
 */

export interface RateLimitDecision {
  allowed: boolean;
  /** 次に試せるまでの秒数（allowed が false のときのみ意味を持つ） */
  retryAfter: number;
  /** 現在のウィンドウで残っている回数 */
  remaining: number;
}

interface Window {
  /** ミリ秒 */
  size: number;
  limit: number;
}

const hits = new Map<string, number[]>();

/** 古いキーが残り続けないよう、一定間隔で掃除する */
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number, maxWindow: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, timestamps] of hits) {
    const alive = timestamps.filter((t) => now - t < maxWindow);
    if (alive.length === 0) hits.delete(key);
    else hits.set(key, alive);
  }
}

/**
 * 短期・長期の2つのウィンドウで判定する。
 * 短期は連打を、長期は一人あたりの1時間の総量を抑える。
 */
export function checkRateLimit(
  key: string,
  windows: Window[],
  now: number = Date.now()
): RateLimitDecision {
  const maxWindow = Math.max(...windows.map((w) => w.size));
  sweep(now, maxWindow);

  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < maxWindow);

  for (const window of windows) {
    const inWindow = timestamps.filter((t) => now - t < window.size);
    if (inWindow.length >= window.limit) {
      const oldest = Math.min(...inWindow);
      const retryAfter = Math.max(1, Math.ceil((window.size - (now - oldest)) / 1000));
      hits.set(key, timestamps);
      return { allowed: false, retryAfter, remaining: 0 };
    }
  }

  timestamps.push(now);
  hits.set(key, timestamps);

  const tightest = windows.reduce((min, w) => {
    const used = timestamps.filter((t) => now - t < w.size).length;
    return Math.min(min, w.limit - used);
  }, Number.POSITIVE_INFINITY);

  return { allowed: true, retryAfter: 0, remaining: Math.max(0, tightest) };
}

/** テスト用。プロセス内の状態を消す */
export function resetRateLimit(): void {
  hits.clear();
  lastSweep = 0;
}

/**
 * リクエスト元の識別子。
 * リバースプロキシ配下では X-Forwarded-For の左端が元のクライアントになる。
 * ヘッダは偽装できるので、これは「悪意ある回避」ではなく「素の連投」を抑えるためのもの。
 */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? "unknown";
}
