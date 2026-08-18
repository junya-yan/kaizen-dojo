/**
 * 出題データの型定義。
 *
 * 設問データ（domains.json / fixes.json）はコードから分離してあり、
 * 問題の追加・修正はJSONの編集だけで完結する。読み込み時に
 * `src/data/index.ts` が形を検証するので、壊れたJSONは起動時に落ちる。
 */

export type Severity = "Critical" | "Major" | "Minor";

export type QuestionType = "mcq" | "free";

/** 四択・記述で共通のフィールド */
export interface BaseQuestion {
  /** 設問ID。例 "rev-1"。FIXES のキーにもなるので全体で一意にすること */
  id: string;
  type: QuestionType;
  severity: Severity;
  /** 状況説明（前提） */
  situation: string;
  /** 対象コード（複数行、言語混在可）。判断のみを問う設問では省略できる */
  code?: string;
  /** 設問文 */
  prompt: string;
}

export interface McqQuestion extends BaseQuestion {
  type: "mcq";
  /** 4択 */
  choices: string[];
  /** 正解の index */
  answer: number;
  explanation: string;
  /** 一般化した原則（他の場面へ転用できる一文） */
  principle: string;
}

export interface FreeQuestion extends BaseQuestion {
  type: "free";
  /** AI採点・自己採点の基準（観点の箇条書き） */
  rubric: string[];
}

export type Question = McqQuestion | FreeQuestion;

export interface Domain {
  id: string;
  /** 表示用の番号 "01"〜"05" */
  no: string;
  name: string;
  /** 一行の紹介文 */
  lead: string;
  questions: Question[];
}

export type FixLang = "js" | "sql" | "bash";

/** 模範解答。コードを伴わない判断系の設問には無くてよい */
export interface Fix {
  lang: FixLang;
  /** 修正後の完全なコード */
  code: string;
  /** 変更点の箇条書き（なぜその形にしたか） */
  notes: string[];
}

export type FixMap = Record<string, Fix>;
