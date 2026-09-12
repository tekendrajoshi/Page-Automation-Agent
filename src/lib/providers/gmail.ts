import { google } from "googleapis";
import { env, hasGmailConfig } from "@/lib/config";
import { googleOAuthClient } from "@/lib/providers/googleAuth";
import type { RawSourceItem } from "@/lib/types";
import { cleanText, truncate } from "@/lib/utils/text";

type GmailPayload = {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: GmailPayload[] | null;
};

export async function fetchStudentEmails(): Promise<RawSourceItem[]> {
  if (!hasGmailConfig()) return [];

  const gmail = google.gmail({
    version: "v1",
    auth: oauthClient()
  });

  const list = await gmail.users.messages.list({
    userId: env.GMAIL_USER_ID,
    q: env.GMAIL_QUERY,
    maxResults: 20
  });

  const messages = list.data.messages ?? [];
  const items = await Promise.all(
    messages.map(async (message) => {
      const full = await gmail.users.messages.get({
        userId: env.GMAIL_USER_ID,
        id: message.id!,
        format: "full"
      });

      const headers = full.data.payload?.headers ?? [];
      const subject = header(headers, "subject") || "Student message";
      const from = header(headers, "from");
      const body = extractBody(full.data.payload);

      return {
        sourceType: "GMAIL" as const,
        sourceName: "Student Gmail Inbox",
        externalId: full.data.id ?? message.id,
        title: subject,
        body: truncate(`From: ${from}\n\n${body || full.data.snippet || ""}`, 1200),
        rawJson: {
          id: full.data.id,
          threadId: full.data.threadId,
          snippet: full.data.snippet,
          headers: { subject, from }
        }
      };
    })
  );

  return items;
}

function oauthClient() {
  const client = googleOAuthClient();
  client.setCredentials({ refresh_token: env.GMAIL_REFRESH_TOKEN });
  return client;
}

function header(headers: Array<{ name?: string | null; value?: string | null }>, name: string) {
  return headers.find((item) => item.name?.toLowerCase() === name)?.value ?? "";
}

function extractBody(payload: GmailPayload | null | undefined): string {
  if (!payload) return "";
  const parts = walkParts(payload);
  const preferred = parts.find((part) => part.mimeType === "text/plain") ?? parts[0];
  if (!preferred?.body?.data) return "";
  return cleanText(Buffer.from(preferred.body.data, "base64url").toString("utf8"));
}

function walkParts(payload: GmailPayload) {
  const result: Array<{ mimeType?: string | null; body?: { data?: string | null } | null }> = [];

  function visit(part: GmailPayload) {
    if (part.body?.data) result.push({ mimeType: part.mimeType, body: part.body });
    part.parts?.forEach((child) => visit(child));
  }

  visit(payload);
  return result;
}
