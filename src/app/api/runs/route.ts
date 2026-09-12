import { NextRequest, NextResponse } from "next/server";
import { runFullAutomation, runGmailAutomation, runSourceAutomation } from "@/lib/workflows/pipeline";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const type = body.type ?? "full";

  const result =
    type === "gmail"
      ? await runGmailAutomation()
      : type === "sources"
        ? await runSourceAutomation()
        : await runFullAutomation();

  return NextResponse.json({ ok: true, result });
}
