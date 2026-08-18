import { z } from "zod";

/** これ未満の文字数では採点を受け付けない（UI側でもボタンを無効化する） */
export const MIN_ANSWER_LENGTH = 10;

/** 回答の上限。長文をそのままモデルに渡してコストが跳ねるのを防ぐ */
export const MAX_ANSWER_LENGTH = 8000;

/** 合格ライン。UIの色分けと verdict の境界で共有する */
export const PASS_SCORE = 76;

/** 基準の半分程度に届いたとみなすライン */
export const PARTIAL_SCORE = 60;

/**
 * 採点結果の形。クライアントとサーバーで共有する。
 *
 * サーバー側は構造化出力（output_config.format）としてこのスキーマをそのままモデルに渡す。
 * 「JSON以外の文字列が混ざってパースに失敗する」経路自体が無くなるため、
 * コードフェンスの除去のような後処理は要らない。
 */
export const gradeResultSchema = z.object({
  score: z.number().int().min(0).max(100).describe("0〜100点。採点基準の充足度で決める"),
  verdict: z.enum(["合格", "要修正"]).describe(`${PASS_SCORE}点以上なら「合格」、それ未満は「要修正」`),
  covered: z.array(z.string()).describe("受講者の回答が押さえていた観点。回答の言葉に即して書く"),
  missed: z
    .array(z.string())
    .describe("抜けていた観点。何が抜けていたかに加えて、なぜそれが重要かを一文で添える"),
  comment: z.string().describe("総評。2〜4文。良かった点と足りない点を具体的に述べる"),
  nextStep: z.string().describe("次に何を練習・確認すべきかを1〜2文で示す"),
});

export type GradeResult = z.infer<typeof gradeResultSchema>;

export const gradeRequestSchema = z.object({
  questionId: z.string().min(1).max(64),
  answer: z.string().min(MIN_ANSWER_LENGTH).max(MAX_ANSWER_LENGTH),
});

export type GradeRequest = z.infer<typeof gradeRequestSchema>;

export type GradeErrorCode =
  | "invalid_request"
  | "unknown_question"
  | "rate_limited"
  | "not_configured"
  | "upstream_error";

export interface GradeErrorBody {
  error: GradeErrorCode;
  message: string;
  /** rate_limited のとき、次に試せるまでの秒数 */
  retryAfter?: number;
}
