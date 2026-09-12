import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config";
import { approveProposal } from "@/lib/workflows/pipeline";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  const proposal = await approveProposal(id, env.ADMIN_EMAIL || "admin");
  return NextResponse.json({ ok: true, proposal });
}
