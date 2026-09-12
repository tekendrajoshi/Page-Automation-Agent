import { google } from "googleapis";
import { env } from "@/lib/config";

export const gmailReadonlyScope = "https://www.googleapis.com/auth/gmail.readonly";

export function googleOAuthClient() {
  return new google.auth.OAuth2(
    env.GMAIL_CLIENT_ID ?? "",
    env.GMAIL_CLIENT_SECRET ?? "",
    env.GMAIL_REDIRECT_URI ?? ""
  );
}
