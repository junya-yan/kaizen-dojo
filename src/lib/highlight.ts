/**
 * コード表示用の簡易シンタックスハイライト。
 *
 * 正規表現ベースのトークナイザで、コメント・文字列・数値・予約語だけを色分けする。
 * 構文解析はしない（設問のコードはJS/SQL/シェルが混在するため、正確さより
 * 「どの言語でも大きく外さない」ことを優先している）。
 */

export type TokenKind = "plain" | "comment" | "string" | "number" | "keyword";

export interface Token {
  kind: TokenKind;
  value: string;
}

export type HighlightLang = "js" | "sql" | "bash";

const JS_KEYWORDS = [
  "async", "await", "break", "case", "catch", "class", "const", "continue", "default",
  "delete", "do", "else", "export", "extends", "finally", "for", "from", "function",
  "if", "import", "in", "instanceof", "let", "new", "of", "return", "static", "super",
  "switch", "this", "throw", "try", "typeof", "var", "void", "while", "yield",
  "true", "false", "null", "undefined", "describe", "test", "expect", "beforeEach", "afterEach",
];

const SQL_KEYWORDS = [
  "ADD", "ALTER", "AND", "AS", "ASC", "BEGIN", "BETWEEN", "BIGINT", "BIGSERIAL", "BOOLEAN",
  "BY", "CASCADE", "CHAR", "CHECK", "COLUMN", "CONSTRAINT", "CREATE", "DEFAULT", "DELETE",
  "DESC", "DISTINCT", "DROP", "END", "EXISTS", "FOREIGN", "FROM", "FUNCTION", "GROUP",
  "HAVING", "IN", "INDEX", "INNER", "INSERT", "INT", "INTEGER", "INTO", "IS", "JOIN", "KEY",
  "LEFT", "LIKE", "LIMIT", "NOT", "NULL", "NUMERIC", "ON", "OR", "ORDER", "OUTER", "PRIMARY",
  "REFERENCES", "RESTRICT", "RETURNS", "RIGHT", "SELECT", "SET", "TABLE", "TEXT", "THEN",
  "TIMESTAMPTZ", "TRIGGER", "UNION", "UNIQUE", "UPDATE", "USING", "VALUES", "WHERE", "WITH",
];

const BASH_KEYWORDS = [
  "cd", "do", "done", "echo", "elif", "else", "esac", "exit", "export", "fi", "for",
  "function", "if", "in", "local", "then", "while", "case", "return", "set", "source",
];

function keywordPattern(lang: HighlightLang): string {
  const words =
    lang === "sql"
      ? [...SQL_KEYWORDS, ...SQL_KEYWORDS.map((w) => w.toLowerCase())]
      : lang === "bash"
        ? BASH_KEYWORDS
        : [...JS_KEYWORDS, ...SQL_KEYWORDS];
  // 長いものから並べて、部分一致で切れないようにする
  const sorted = [...new Set(words)].sort((a, b) => b.length - a.length);
  return sorted.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
}

const patternCache = new Map<HighlightLang, RegExp>();

function tokenPattern(lang: HighlightLang): RegExp {
  const cached = patternCache.get(lang);
  if (cached) return cached;

  const comment = lang === "bash" ? "#.*" : "//.*|--.*";
  const string = "'(?:[^'\\\\]|\\\\.)*'|\"(?:[^\"\\\\]|\\\\.)*\"|`(?:[^`\\\\]|\\\\.)*`";
  const number = "\\b\\d[\\d_]*(?:\\.\\d+)?\\b";

  // 左から順に評価されるので、文字列の中の // はコメントにならない
  const pattern = new RegExp(
    `(${string})|(${comment})|(${number})|\\b(${keywordPattern(lang)})\\b`,
    "g"
  );
  patternCache.set(lang, pattern);
  return pattern;
}

/** 1行をトークンに分解する。改行は含めないこと */
export function tokenizeLine(line: string, lang: HighlightLang = "js"): Token[] {
  const tokens: Token[] = [];
  const pattern = tokenPattern(lang);
  pattern.lastIndex = 0;

  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > cursor) {
      tokens.push({ kind: "plain", value: line.slice(cursor, match.index) });
    }

    const [value, str, comment, num] = match;
    const kind: TokenKind = str ? "string" : comment ? "comment" : num ? "number" : "keyword";
    tokens.push({ kind, value });

    cursor = match.index + value.length;

    // 空文字にマッチした場合の無限ループ避け
    if (value.length === 0) pattern.lastIndex++;
  }

  if (cursor < line.length) {
    tokens.push({ kind: "plain", value: line.slice(cursor) });
  }

  return tokens;
}

/** コード全体を行ごとのトークン列にする */
export function tokenize(code: string, lang: HighlightLang = "js"): Token[][] {
  return code.replace(/\t/g, "  ").split("\n").map((line) => tokenizeLine(line, lang));
}

/**
 * 設問のコードは言語が明示されていないので、見た目から推定する。
 * 外した場合でも色が少し変わるだけなので、単純な判定に留めている。
 */
export function detectLang(code: string): HighlightLang {
  if (/^#!\s*\/(usr\/)?bin\/(env\s+)?(ba)?sh/m.test(code)) return "bash";

  const sqlSignals = /\b(CREATE\s+TABLE|ALTER\s+TABLE|SELECT\s+[\s\S]*\bFROM\b|INSERT\s+INTO|UPDATE\s+\w+\s+SET)\b/i;
  if (sqlSignals.test(code) && !/\b(function|const|let|=>)\b/.test(code)) return "sql";

  return "js";
}
