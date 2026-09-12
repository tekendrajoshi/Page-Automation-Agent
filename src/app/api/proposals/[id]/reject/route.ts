import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config";
import { rejectProposal } from "@/lib/workflows/pipeline";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const proposal = await rejectProposal(id, env.ADMIN_EMAIL || "admin", body.note);
  return NextResponse.json({ ok: true, proposal });
}
