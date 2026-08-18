import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { checkRateLimit, clientKeyFromHeaders, resetRateLimit } from "./rate-limit.ts";

const WINDOWS = [
  { size: 60_000, limit: 3 },
  { size: 3_600_000, limit: 5 },
];

beforeEach(() => resetRateLimit());

test("上限までは通し、超えたら止める", () => {
  const now = 1_000_000;

  for (let i = 0; i < 3; i++) {
    assert.equal(checkRateLimit("a", WINDOWS, now + i).allowed, true, `${i + 1}回目`);
  }

  const blocked = checkRateLimit("a", WINDOWS, now + 3);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfter > 0 && blocked.retryAfter <= 60);
});

test("ウィンドウが過ぎれば再び通る", () => {
  const now = 1_000_000;
  for (let i = 0; i < 3; i++) checkRateLimit("b", WINDOWS, now);

  assert.equal(checkRateLimit("b", WINDOWS, now + 59_000).allowed, false);
  assert.equal(checkRateLimit("b", WINDOWS, now + 61_000).allowed, true);
});

test("長期のウィンドウも効く", () => {
  const now = 1_000_000;
  // 1分ごとに1回なら短期の上限には掛からないが、1時間で5回を超えたら止まる
  for (let i = 0; i < 5; i++) {
    assert.equal(checkRateLimit("c", WINDOWS, now + i * 61_000).allowed, true, `${i + 1}回目`);
  }
  assert.equal(checkRateLimit("c", WINDOWS, now + 5 * 61_000).allowed, false);
});

test("キーが違えば互いに影響しない", () => {
  const now = 1_000_000;
  for (let i = 0; i < 3; i++) checkRateLimit("d", WINDOWS, now);
  assert.equal(checkRateLimit("e", WINDOWS, now).allowed, true);
});

test("X-Forwarded-For の左端をクライアントとして扱う", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
  assert.equal(clientKeyFromHeaders(headers), "203.0.113.7");
  assert.equal(clientKeyFromHeaders(new Headers({ "x-real-ip": "198.51.100.2" })), "198.51.100.2");
  assert.equal(clientKeyFromHeaders(new Headers()), "unknown");
});
