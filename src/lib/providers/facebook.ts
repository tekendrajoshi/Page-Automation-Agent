import { env, hasFacebookConfig } from "@/lib/config";

export type FacebookPublishResult = {
  id: string;
};

export async function publishToFacebook(caption: string, imageUrl?: string): Promise<FacebookPublishResult> {
  if (!hasFacebookConfig()) {
    throw new Error("Facebook page credentials are not configured.");
  }

  if (imageUrl) {
    const photo = await graphRequest(`/${env.FACEBOOK_PAGE_ID}/photos`, {
      url: imageUrl,
      caption,
      published: "true"
    });
    return { id: String(photo.post_id ?? photo.id) };
  }

  const post = await graphRequest(`/${env.FACEBOOK_PAGE_ID}/feed`, {
    message: caption
  });

  return { id: String(post.id) };
}

async function graphRequest(path: string, params: Record<string, string>) {
  const url = new URL(`https://graph.facebook.com/${env.FACEBOOK_GRAPH_VERSION}${path}`);
  url.searchParams.set("access_token", env.FACEBOOK_PAGE_ACCESS_TOKEN!);

  const response = await fetch(url, {
    method: "POST",
    body: new URLSearchParams(params)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Facebook publish failed: ${JSON.stringify(data)}`);
  }

  return data as { id?: string; post_id?: string };
}
