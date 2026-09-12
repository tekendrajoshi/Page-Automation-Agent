import * as cheerio from "cheerio";
import { env } from "@/lib/config";
import type { RawSourceItem } from "@/lib/types";
import { cleanText, truncate } from "@/lib/utils/text";

const interestingLink = /(notice|exam|result|routine|schedule|form|admission|back|regular|chance|BE|B\.?E\.?|BArch|MSc|PhD|pdf)/i;

export async function scrapeIoeExam(): Promise<RawSourceItem[]> {
  const response = await fetch(env.IOE_EXAM_URL, {
    headers: {
      "user-agent": "IOEPageAutomationAgent/1.0 (+student notice monitor)"
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`IOE exam page returned ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const items: RawSourceItem[] = [];

  $("a").each((_, element) => {
    const anchor = $(element);
    const title = cleanText(anchor.text() || anchor.attr("title"));
    const href = anchor.attr("href");

    if (!title || !href) return;
    if (!interestingLink.test(`${title} ${href}`)) return;

    const url = new URL(href, env.IOE_EXAM_URL).toString();
    const surroundingText = cleanText(anchor.closest("tr, li, article, div").text());

    items.push({
      sourceType: "IOE_EXAM",
      sourceName: "IOE Exam Control Division",
      sourceUrl: url,
      externalId: url,
      title,
      body: truncate(surroundingText || title, 700),
      rawJson: { href, title, surroundingText }
    });
  });

  const pageTitle = cleanText($("title").first().text());
  if (items.length === 0 && pageTitle) {
    items.push({
      sourceType: "IOE_EXAM",
      sourceName: "IOE Exam Control Division",
      sourceUrl: env.IOE_EXAM_URL,
      externalId: env.IOE_EXAM_URL,
      title: pageTitle,
      body: truncate(cleanText($("body").text()), 1000),
      rawJson: { fallback: true }
    });
  }

  return uniqueByExternalId(items).slice(0, 40);
}

function uniqueByExternalId(items: RawSourceItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.externalId ?? `${item.title}:${item.sourceUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
