import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/config";
import { fallbackDecision } from "@/lib/ai/fallback";
import type { AiDecision, RawSourceItem } from "@/lib/types";

export async function evaluateAndDraft(item: RawSourceItem): Promise<AiDecision> {
  if (!env.GEMINI_API_KEY) {
    return fallbackDecision(item);
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const prompt = [
    "You are the content editor for a Nepali IOE students Facebook page.",
    "Decide if the source item deserves a page post.",
    "Only accept official IOE notices, exam notices, result updates, routines, scholarships, genuine student issues, or education news clearly relevant to IOE engineering students.",
    "Reject rumors, political promotion, hate, private personal data, unrelated NEB posts, and anything that is too weakly verified.",
    "Write in natural English with a Nepali student-page tone. Keep it short and useful.",
    "Return only JSON.",
    JSON.stringify(item)
  ].join("\n\n");

  try {
    const response = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            relevant: { type: "boolean" },
            category: {
              type: "string",
              enum: [
                "exam_notice",
                "result",
                "routine",
                "student_issue",
                "scholarship",
                "general_ioe_news",
                "ignore"
              ]
            },
            relevanceScore: { type: "number" },
            confidence: { type: "number" },
            title: { type: "string" },
            caption: { type: "string" },
            reason: { type: "string" },
            safetyNotes: { type: "string" },
            suggestedPublishAt: { type: "string" }
          },
          required: [
            "relevant",
            "category",
            "relevanceScore",
            "confidence",
            "title",
            "caption",
            "reason"
          ]
        }
      }
    });

    return normalizeDecision(JSON.parse(response.text ?? "{}"));
  } catch (error) {
    const fallback = fallbackDecision(item);
    return {
      ...fallback,
      safetyNotes: `Gemini failed, fallback heuristic used. ${error instanceof Error ? error.message : ""}`.trim()
    };
  }
}

function normalizeDecision(value: Partial<AiDecision>): AiDecision {
  const confidence = clampNumber(value.confidence, 0, 1, 0.5);
  const relevanceScore = clampNumber(value.relevanceScore, 0, 1, confidence);
  const category = value.category ?? "ignore";

  return {
    relevant: Boolean(value.relevant && category !== "ignore"),
    category,
    relevanceScore,
    confidence,
    title: value.title?.trim() || "IOE update",
    caption: value.caption?.trim() || "Please check the official source for details.",
    reason: value.reason?.trim() || "AI generated decision.",
    safetyNotes: value.safetyNotes?.trim() || undefined,
    suggestedPublishAt: value.suggestedPublishAt
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
