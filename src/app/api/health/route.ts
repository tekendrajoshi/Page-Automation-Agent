import { NextResponse } from "next/server";
import { hasFacebookConfig, hasGmailConfig } from "@/lib/config";
import { prisma } from "@/lib/db";

export async function GET() {
  await prisma.$queryRaw`SELECT 1`;

  return NextResponse.json({
    ok: true,
    services: {
      database: true,
      facebook: hasFacebookConfig(),
      gmail: hasGmailConfig(),
      gemini: Boolean(process.env.GEMINI_API_KEY)
    }
  });
}
