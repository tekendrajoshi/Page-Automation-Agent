import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const proposals = await prisma.postProposal.findMany({
    orderBy: { createdAt: "desc" },
    include: { sourceItem: true },
    take: 100
  });

  return NextResponse.json({ proposals });
}
