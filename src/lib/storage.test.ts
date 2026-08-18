import assert from "node:assert/strict";
import { test } from "node:test";

import {
  answeredCount,
  domainAverage,
  recordScore,
  totalAnsweredCount,
  type Progress,
} from "./storage.ts";

const progress: Progress = {
  review: { "rev-1": 100, "rev-2": 80 },
  db: { "db-1": 0 },
};

test("スコアを記録しても元のオブジェクトを壊さない", () => {
  const next = recordScore(progress, "review", "rev-3", 60);

  assert.equal(next.review["rev-3"], 60);
  assert.equal(progress.review["rev-3"], undefined);
  assert.equal(next.db, progress.db);
});

test("同じ設問に答え直すと上書きされる", () => {
  const next = recordScore(progress, "review", "rev-1", 40);
  assert.equal(next.review["rev-1"], 40);
  assert.equal(answeredCount(next, "review"), 2);
});

test("回答数を数える", () => {
  assert.equal(answeredCount(progress, "review"), 2);
  assert.equal(answeredCount(progress, "security"), 0);
  assert.equal(totalAnsweredCount(progress), 3);
});

test("平均点は四捨五入し、未回答のドメインは null", () => {
  assert.equal(domainAverage(progress, "review"), 90);
  assert.equal(domainAverage(progress, "db"), 0);
  assert.equal(domainAverage(progress, "security"), null);
  assert.equal(domainAverage({ x: { a: 70, b: 71 } }, "x"), 71);
});
