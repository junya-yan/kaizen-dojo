import domainsJson from "./domains.json";
import fixesJson from "./fixes.json";
import type { Domain, Fix, FixMap, Question } from "./types";
import { assertValidData } from "./validate";

/**
 * JSONで管理している設問データを読み込み、形を検証してから公開する。
 *
 * 設問の追加はJSONの編集だけで完結する。壊れた形のまま気づかず動き続けるより、
 * 起動時に落ちるほうが安全なので、検証は握りつぶさない。
 */

export const DOMAINS = domainsJson as Domain[];
export const FIXES = fixesJson as FixMap;

assertValidData(DOMAINS, FIXES);

export const ALL_QUESTIONS: { domain: Domain; question: Question }[] = DOMAINS.flatMap((domain) =>
  domain.questions.map((question) => ({ domain, question }))
);

export const TOTAL_QUESTION_COUNT = ALL_QUESTIONS.length;

export function getDomain(domainId: string): Domain | undefined {
  return DOMAINS.find((d) => d.id === domainId);
}

export function getQuestion(questionId: string): { domain: Domain; question: Question } | undefined {
  return ALL_QUESTIONS.find((entry) => entry.question.id === questionId);
}

export function getFix(questionId: string): Fix | undefined {
  return FIXES[questionId];
}

/** 抜き打ち検査用。全設問から重複なく count 問を選ぶ */
export function pickRandomQuestions(
  count: number,
  random: () => number = Math.random
): { domain: Domain; question: Question }[] {
  const pool = [...ALL_QUESTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export type { Domain, Fix, FixMap, Question } from "./types";
export type { FreeQuestion, McqQuestion, Severity } from "./types";
