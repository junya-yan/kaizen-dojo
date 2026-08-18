import type { Domain, FixMap, Question } from "./types";

/**
 * 設問データの形を検証する。JSONは型チェックの対象外なので、
 * ここで実際の値を見て、壊れていれば読み込み時点で落とす。
 */

const SEVERITIES = new Set(["Critical", "Major", "Minor"]);
const FIX_LANGS = new Set(["js", "sql", "bash"]);

/** 見つかった問題を全て返す。問題が無ければ空配列 */
export function findDataProblems(domains: Domain[], fixes: FixMap): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const domain of domains) {
    for (const field of ["id", "no", "name", "lead"] as const) {
      if (!domain[field]) problems.push(`domain ${domain.id}: ${field} が空`);
    }
    if (domain.questions.length === 0) {
      problems.push(`domain ${domain.id}: 設問が無い`);
    }

    for (const q of domain.questions) {
      if (seen.has(q.id)) problems.push(`設問IDが重複: ${q.id}`);
      seen.add(q.id);

      if (!q.situation || !q.prompt) problems.push(`${q.id}: situation / prompt が空`);
      if (!SEVERITIES.has(q.severity)) problems.push(`${q.id}: severity が不正 (${q.severity})`);

      if (q.type === "mcq") {
        if (q.choices.length < 2) problems.push(`${q.id}: choices が不足`);
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) {
          problems.push(`${q.id}: answer が choices の範囲外`);
        }
        if (!q.explanation || !q.principle) problems.push(`${q.id}: explanation / principle が空`);
      } else if (q.type === "free") {
        if (!Array.isArray(q.rubric) || q.rubric.length === 0) {
          problems.push(`${q.id}: rubric が空`);
        }
      } else {
        problems.push(`${(q as Question).id}: type が不正`);
      }
    }
  }

  for (const [questionId, fix] of Object.entries(fixes)) {
    if (!seen.has(questionId)) problems.push(`模範解答 ${questionId} に対応する設問が無い`);
    if (!FIX_LANGS.has(fix.lang)) problems.push(`模範解答 ${questionId}: lang が不正 (${fix.lang})`);
    if (!fix.code.trim()) problems.push(`模範解答 ${questionId}: code が空`);
    if (fix.notes.length === 0) problems.push(`模範解答 ${questionId}: notes が空`);
  }

  return problems;
}

export function assertValidData(domains: Domain[], fixes: FixMap): void {
  const problems = findDataProblems(domains, fixes);
  if (problems.length > 0) {
    throw new Error(`設問データが不正です:\n- ${problems.join("\n- ")}`);
  }
}
