import { env } from "@/lib/config";
import type { RawSourceItem } from "@/lib/types";

type GoogleSearchResponse = {
  items?: Array<{
    title: string;
    link: string;
    snippet?: string;
    pagemap?: {
      cse_image?: Array<{ src?: string }>;
    };
  }>;
};

export async function searchRecentIoeNews(): Promise<RawSourceItem[]> {
  if (!env.GOOGLE_SEARCH_API_KEY || !env.GOOGLE_SEARCH_ENGINE_ID) {
    return [];
  }

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", env.GOOGLE_SEARCH_API_KEY);
  url.searchParams.set("cx", env.GOOGLE_SEARCH_ENGINE_ID);
  url.searchParams.set("q", env.NEWS_SEARCH_QUERY);
  url.searchParams.set("dateRestrict", "d7");
  url.searchParams.set("num", "10");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Search failed with ${response.status}`);
  }

  const data = (await response.json()) as GoogleSearchResponse;
  return (data.items ?? []).map((item) => ({
    sourceType: "SEARCH",
    sourceName: "Google Programmable Search",
    sourceUrl: item.link,
    externalId: item.link,
    title: item.title,
    body: item.snippet,
    imageUrl: item.pagemap?.cse_image?.[0]?.src,
    rawJson: item
  }));
}
