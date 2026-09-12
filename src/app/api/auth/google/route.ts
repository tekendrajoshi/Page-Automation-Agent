import { NextResponse } from "next/server";
import { gmailReadonlyScope, googleOAuthClient } from "@/lib/providers/googleAuth";

export async function GET() {
  const client = googleOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [gmailReadonlyScope]
  });

  return NextResponse.redirect(url);
}
