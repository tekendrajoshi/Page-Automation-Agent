import type { SourceType } from "@prisma/client";

export type RawSourceItem = {
  sourceType: SourceType;
  sourceName: string;
  sourceUrl?: string;
  externalId?: string;
  title: string;
  body?: string;
  imageUrl?: string;
  rawJson?: unknown;
};

export type AiDecision = {
  relevant: boolean;
  category: "exam_notice" | "result" | "routine" | "student_issue" | "scholarship" | "general_ioe_news" | "ignore";
  relevanceScore: number;
  confidence: number;
  title: string;
  caption: string;
  reason: string;
  safetyNotes?: string;
  suggestedPublishAt?: string;
};

export type PipelineResult = {
  itemsSeen: number;
  proposals: number;
  published: number;
};
