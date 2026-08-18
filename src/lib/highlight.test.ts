import assert from "node:assert/strict";
import { test } from "node:test";

import { detectLang, tokenize, tokenizeLine } from "./highlight.ts";

test("文字列の中の // をコメントにしない", () => {
  const tokens = tokenizeLine('const url = "http://example.com"; // 実際のコメント', "js");

  assert.deepEqual(
    tokens.filter((t) => t.kind === "string").map((t) => t.value),
    ['"http://example.com"']
  );
  assert.deepEqual(
    tokens.filter((t) => t.kind === "comment").map((t) => t.value),
    ["// 実際のコメント"]
  );
});

test("トークンを連結すると元の行に戻る", () => {
  const lines = [
    "async function f(a) { return a * 2; } // ×2",
    "SELECT id FROM users WHERE name LIKE '%a%';",
    "  const s = `テンプレート ${x}`;",
  ];
  for (const line of lines) {
    assert.equal(tokenizeLine(line, "js").map((t) => t.value).join(""), line);
  }
});

test("SQLのコメントと予約語を拾う", () => {
  const tokens = tokenizeLine("CREATE TABLE users ( -- 注記", "sql");
  assert.ok(tokens.some((t) => t.kind === "keyword" && t.value === "CREATE"));
  assert.ok(tokens.some((t) => t.kind === "comment" && t.value === "-- 注記"));
});

test("シェルは # をコメントとして扱う", () => {
  const tokens = tokenizeLine("export FOO=1 # 注記", "bash");
  assert.ok(tokens.some((t) => t.kind === "comment" && t.value === "# 注記"));
});

test("空行も1行として保持される", () => {
  assert.equal(tokenize("a\n\nb").length, 3);
});

test("言語を推定する", () => {
  assert.equal(detectLang("#!/bin/bash\nset -e"), "bash");
  assert.equal(detectLang("CREATE TABLE users (\n  id BIGSERIAL PRIMARY KEY\n);"), "sql");
  assert.equal(detectLang("const x = 1;\nfunction f() {}"), "js");
  // JSの中にSQL文字列が混ざっていてもJSとして扱う
  assert.equal(detectLang('const q = "SELECT 1 FROM t";\nconst f = () => q;'), "js");
});
