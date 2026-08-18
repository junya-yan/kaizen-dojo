import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";

import { getFix, getQuestion } from "@/data";
import type { FreeQuestion } from "@/data/types";
import {
  gradeRequestSchema,
  gradeResultSchema,
  type GradeErrorBody,
  type GradeResult,
} from "@/lib/grading";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";

/**
 * 記述式回答の採点エンドポイント。
 *
 * ANTHROPIC_API_KEY はこのサーバー側プロセスにだけ存在し、クライアントには一切渡さない。
 * フロントはここだけを叩く。
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

const PER_MINUTE = Number(process.env.GRADE_RATE_LIMIT_PER_MINUTE ?? 6);
const PER_HOUR = Number(process.env.GRADE_RATE_LIMIT_PER_HOUR ?? 60);

const SYSTEM_PROMPT = `あなたは品質に厳しいシニアエンジニアとして、受講者の回答を採点する。

- 採点基準に照らして、実際に押さえられている観点だけを「押さえていた点」に数える。曖昧な言及を好意的に解釈しない。
- 甘い点はつけない。ただし指摘は建設的に、次にどうすればよいかが分かる言葉で書く。
- 受講者が基準の言葉と違う表現を使っていても、内容が同じなら押さえているとみなす。
- 出題の趣旨は「テストも通り、手元では正しく動いているコードに潜むリスクを見つけること」である。
  動作の正しさではなく、リスクの発見と、その理由づけを評価する。
- 出力は日本語で書く。

採点の目安:
- 致命的な観点（データ流出・なりすまし・データの不整合・取り返しのつかない操作）を落としていれば60点未満。
- 採点基準の半分程度を押さえていれば60〜75点。
- 主要な観点を押さえ、なぜ問題なのかの理由まで書けていれば76〜89点。
- 90点以上は、採点基準の外にある妥当な指摘まで含んでいる場合のみ。`;

function buildUserPrompt(question: FreeQuestion, answer: string): string {
  const sections: string[] = [];

  sections.push(`# 状況\n${question.situation}`);

  if (question.code) {
    sections.push(`# 対象コード\n\`\`\`\n${question.code}\n\`\`\``);
  }

  sections.push(`# 設問\n${question.prompt}`);

  sections.push(
    `# 採点基準\n${question.rubric.map((item, i) => `${i + 1}. ${item}`).join("\n")}`
  );

  const fix = getFix(question.id);
  if (fix) {
    sections.push(
      `# 参考: 模範解答のコード\n\`\`\`${fix.lang}\n${fix.code}\n\`\`\`\n` +
        `変更点:\n${fix.notes.map((n) => `- ${n}`).join("\n")}`
    );
  }

  // 受講者の回答は最後に置く。ここから上は設問ごとに固定なので、
  // プロンプトキャッシュの前置きとして安定させられる。
  sections.push(`# 受講者の回答\n${answer}`);

  return sections.join("\n\n");
}

function errorResponse(status: number, body: GradeErrorBody): NextResponse<GradeErrorBody> {
  const res = NextResponse.json(body, { status });
  if (body.retryAfter) res.headers.set("Retry-After", String(body.retryAfter));
  return res;
}

export async function POST(request: Request): Promise<NextResponse<GradeResult | GradeErrorBody>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return errorResponse(503, {
      error: "not_configured",
      message: "採点機能が設定されていません。ANTHROPIC_API_KEY を設定してください。",
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, { error: "invalid_request", message: "リクエストの形式が不正です。" });
  }

  const parsed = gradeRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return errorResponse(400, {
      error: "invalid_request",
      message: "設問IDまたは回答の形式が不正です。",
    });
  }

  const entry = getQuestion(parsed.data.questionId);
  if (!entry || entry.question.type !== "free") {
    return errorResponse(404, {
      error: "unknown_question",
      message: "記述式の設問が見つかりません。",
    });
  }

  const limit = checkRateLimit(clientKeyFromHeaders(request.headers), [
    { size: 60_000, limit: PER_MINUTE },
    { size: 3_600_000, limit: PER_HOUR },
  ]);

  if (!limit.allowed) {
    return errorResponse(429, {
      error: "rate_limited",
      message: `採点の間隔が短すぎます。${limit.retryAfter}秒ほど置いてから試してください。`,
      retryAfter: limit.retryAfter,
    });
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildUserPrompt(entry.question, parsed.data.answer) },
      ],
      output_config: { format: zodOutputFormat(gradeResultSchema) },
    });

    const result = response.parsed_output;
    if (!result) {
      return errorResponse(502, {
        error: "upstream_error",
        message: "採点結果を読み取れませんでした。時間をおいて試してください。",
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    // 例外の中身はクライアントに返さない（内部構成や設定が漏れる）
    if (err instanceof Anthropic.RateLimitError) {
      return errorResponse(429, {
        error: "rate_limited",
        message: "採点が混み合っています。少し時間をおいて試してください。",
        retryAfter: 30,
      });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("[grade] 認証に失敗しました。ANTHROPIC_API_KEY を確認してください。", err);
      return errorResponse(503, {
        error: "not_configured",
        message: "採点機能が正しく設定されていません。",
      });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      console.error("[grade] 接続に失敗しました。", err);
      return errorResponse(504, {
        error: "upstream_error",
        message: "採点サービスに接続できませんでした。時間をおいて試してください。",
      });
    }

    console.error("[grade] 採点に失敗しました。", err);
    return errorResponse(502, {
      error: "upstream_error",
      message: "採点に失敗しました。時間をおいて試してください。",
    });
  }
}
