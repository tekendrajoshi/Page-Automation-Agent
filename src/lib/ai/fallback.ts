import { blockedKeywords } from "@/lib/config";
import type { AiDecision, RawSourceItem } from "@/lib/types";
import { containsAnyKeyword, truncate } from "@/lib/utils/text";

const categoryMatchers: Array<[AiDecision["category"], RegExp]> = [
  ["result", /\b(result|results|pass list|marksheet)\b/i],
  ["routine", /\b(routine|schedule|exam schedule|time table|timetable)\b/i],
  ["exam_notice", /\b(exam|examination|notice|form|admit|back paper)\b/i],
  ["scholarship", /\b(scholarship|grant|financial aid)\b/i],
  ["student_issue", /\b(problem|issue|complaint|lost|found|help|urgent)\b/i],
  ["general_ioe_news", /\b(ioe|pulchowk|thapathali|engineering|tribhuvan)\b/i]
];

export function fallbackDecision(item: RawSourceItem): AiDecision {
  const text = `${item.title} ${item.body ?? ""}`;
  const blocked = containsAnyKeyword(text, blockedKeywords);
  const match = categoryMatchers.find(([, regex]) => regex.test(text));
  const category = blocked ? "ignore" : match?.[0] ?? "ignore";
  const relevant = category !== "ignore";
  const confidence = relevant ? 0.72 : 0.42;

  return {
    relevant,
    category,
    relevanceScore: relevant ? 0.78 : 0.2,
    confidence,
    title: truncate(item.title, 120),
    caption: relevant
      ? buildCaption(item, category)
      : "Ignored because it did not look relevant for IOE students.",
    reason: relevant
      ? "Matched local IOE/student notice keywords. Gemini can improve this once GEMINI_API_KEY is added."
      : "No strong IOE/student relevance signal was found.",
    safetyNotes: blocked ? "Blocked keyword matched. Review manually before posting." : undefined
  };
}

function buildCaption(item: RawSourceItem, category: AiDecision["category"]) {
  const label = category.replaceAll("_", " ").toUpperCase();
  const source = item.sourceUrl ? `\n\nSource: ${item.sourceUrl}` : "";
  return truncate(`[${label}]\n${item.title}\n\n${item.body ?? "Please check the official notice for full details."}${source}`, 1800);
}
