import * as cheerio from "cheerio";
import { configuredSourceUrls } from "@/lib/config";
import type { RawSourceItem } from "@/lib/types";
import { cleanText, truncate } from "@/lib/utils/text";

export async function scrapeConfiguredWebSources(): Promise<RawSourceItem[]> {
  const results = await Promise.allSettled(configuredSourceUrls.map(scrapeWebSource));
  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

async function scrapeWebSource(url: string): Promise<RawSourceItem[]> {
  const response = await fetch(url, {
    headers: { "user-agent": "IOEPageAutomationAgent/1.0" },
    next: { revalidate: 0 }
  });

  if (!response.ok) return [];

  const html = await response.text();
  const $ = cheerio.load(html);
  const sourceName = cleanText($("title").first().text()) || new URL(url).hostname;
  const items: RawSourceItem[] = [];

  $("article, tr, li, .post, .notice, .entry").each((_, element) => {
    const block = $(element);
    const link = block.find("a").first();
    const title = cleanText(block.find("h1,h2,h3,h4,a").first().text());
    const href = link.attr("href");
    const text = cleanText(block.text());
    const image = block.find("img").first().attr("src");

    if (!title || text.length < 12) return;

    items.push({
      sourceType: "WEB",
      sourceName,
      sourceUrl: href ? new URL(href, url).toString() : url,
      externalId: href ? new URL(href, url).toString() : `${url}#${title}`,
      title,
      body: truncate(text, 800),
      imageUrl: image ? new URL(image, url).toString() : undefined,
      rawJson: { baseUrl: url }
    });
  });

  return items.slice(0, 25);
}
