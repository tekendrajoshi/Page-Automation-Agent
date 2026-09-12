import { z } from "zod";

const booleanFromEnv = z
  .string()
  .optional()
  .transform((value) => value === "true" || value === "1");

const envSchema = z.object({
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  APP_TIMEZONE: z.string().default("Asia/Kathmandu"),
  ADMIN_EMAIL: z.string().email().optional().or(z.literal("")),
  AUTO_PUBLISH: booleanFromEnv,
  MIN_CONFIDENCE_TO_AUTO_PUBLISH: z.coerce.number().min(0).max(1).default(0.92),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.8-flash"),
  FACEBOOK_PAGE_ID: z.string().optional(),
  FACEBOOK_PAGE_ACCESS_TOKEN: z.string().optional(),
  FACEBOOK_GRAPH_VERSION: z.string().default("v23.0"),
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_REDIRECT_URI: z.string().optional(),
  GMAIL_REFRESH_TOKEN: z.string().optional(),
  GMAIL_USER_ID: z.string().default("me"),
  GMAIL_QUERY: z
    .string()
    .default("is:unread newer_than:14d (student OR exam OR result OR ioe OR notice OR problem)"),
  IOE_EXAM_URL: z.string().url().default("https://exam.ioe.tu.edu.np/"),
  SOURCE_URLS: z.string().default("https://exam.ioe.tu.edu.np/"),
  NEWS_SEARCH_QUERY: z.string().default("Institute of Engineering IOE Nepal exam result notice"),
  GOOGLE_SEARCH_API_KEY: z.string().optional(),
  GOOGLE_SEARCH_ENGINE_ID: z.string().optional(),
  BLOCKED_KEYWORDS: z.string().default("violence,hate,adult,political campaign,rumor,unverified death")
});

export const env = envSchema.parse(process.env);

export const configuredSourceUrls = env.SOURCE_URLS.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const blockedKeywords = env.BLOCKED_KEYWORDS.split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

export function hasFacebookConfig() {
  return Boolean(env.FACEBOOK_PAGE_ID && env.FACEBOOK_PAGE_ACCESS_TOKEN);
}

export function hasGmailConfig() {
  return Boolean(
    env.GMAIL_CLIENT_ID &&
      env.GMAIL_CLIENT_SECRET &&
      env.GMAIL_REDIRECT_URI &&
      env.GMAIL_REFRESH_TOKEN
  );
}
