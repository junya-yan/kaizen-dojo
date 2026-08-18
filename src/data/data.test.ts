import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import type { Domain, FixMap } from "./types.ts";
import { findDataProblems } from "./validate.ts";

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(fileURLToPath(new URL(name, import.meta.url)), "utf8")) as T;
}

const domains = readJson<Domain[]>("./domains.json");
const fixes = readJson<FixMap>("./fixes.json");

test("設問データが検証を通る", () => {
  assert.deepEqual(findDataProblems(domains, fixes), []);
});

test("5ドメイン・各5問・合計25問である", () => {
  assert.equal(domains.length, 5);
  for (const domain of domains) {
    assert.equal(domain.questions.length, 5, `${domain.id} の設問数`);
  }
  assert.equal(
    domains.reduce((n, d) => n + d.questions.length, 0),
    25
  );
});

test("四択の正解が選択肢の範囲に収まっている", () => {
  for (const domain of domains) {
    for (const q of domain.questions) {
      if (q.type !== "mcq") continue;
      assert.equal(q.choices.length, 4, `${q.id} の選択肢数`);
      assert.ok(q.answer >= 0 && q.answer < 4, `${q.id} の正解 index`);
    }
  }
});

test("模範解答は実在する設問にだけ紐づく", () => {
  const ids = new Set(domains.flatMap((d) => d.questions.map((q) => q.id)));
  for (const questionId of Object.keys(fixes)) {
    assert.ok(ids.has(questionId), `${questionId} に対応する設問がある`);
  }
});

test("検証は壊れたデータを見つける", () => {
  const broken: Domain[] = [
    {
      id: "x",
      no: "01",
      name: "壊れたドメイン",
      lead: "テスト用",
      questions: [
        {
          id: "x-1",
          type: "mcq",
          severity: "Fatal" as never,
          situation: "状況",
          prompt: "設問",
          choices: ["a", "b"],
          answer: 9,
          explanation: "",
          principle: "",
        },
      ],
    },
  ];

  const problems = findDataProblems(broken, { "no-such-question": { lang: "js", code: "x", notes: ["n"] } });

  assert.ok(problems.some((p) => p.includes("severity")));
  assert.ok(problems.some((p) => p.includes("answer")));
  assert.ok(problems.some((p) => p.includes("no-such-question")));
});
