import { NextRequest, NextResponse } from "next/server";
import { googleOAuthClient } from "@/lib/providers/googleAuth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return new NextResponse("Missing Google OAuth code.", { status: 400 });
  }

  const client = googleOAuthClient();
  const { tokens } = await client.getToken(code);
  const refreshToken = tokens.refresh_token ?? "";

  return new NextResponse(
    `<!doctype html>
    <html>
      <head>
        <title>Gmail connected</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 32px; line-height: 1.5; }
          code { display: block; margin-top: 12px; padding: 16px; background: #f2f4f7; border-radius: 8px; word-break: break-all; }
        </style>
      </head>
      <body>
        <h1>Gmail OAuth completed</h1>
        <p>Put this value in your local env as <strong>GMAIL_REFRESH_TOKEN</strong>.</p>
        <code>${escapeHtml(refreshToken || "No refresh token returned. Try again with prompt=consent.")}</code>
      </body>
    </html>`,
    {
      headers: { "content-type": "text/html" }
    }
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
