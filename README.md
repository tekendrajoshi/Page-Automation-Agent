# IOE Page Automation Agent

I built this project to automate the boring part of running a student-focused Facebook page: checking IOE notices, reading student emails, deciding what is useful, drafting posts, and giving the admin one place to approve or reject everything.

The main idea is simple: the page should not blindly post every scraped thing. It should collect updates, remove duplicates, ask an AI model to judge relevance, prepare a clean Facebook caption, and then wait for approval unless auto-publish is enabled.

## What It Does

- Checks the official IOE exam page: `https://exam.ioe.tu.edu.np/`
- Monitors extra source URLs added in `.env`
- Optionally searches the web for recent IOE-related news through Google Programmable Search
- Checks Gmail for student issues, complaints, exam questions, and notices
- Uses Gemini to decide whether the item is relevant and to draft a post
- Falls back to local keyword rules when Gemini is not configured
- Stores all source items, AI decisions, approval events, runs, and publish results in Postgres
- Publishes to a Facebook Page through the Meta Graph API after approval
- Provides a dashboard for running the agent and approving posts
- Includes a background worker for frequent Gmail checks and daily source checks

## Tech Stack

- Next.js + React for the dashboard and backend routes
- TypeScript for the full codebase
- Prisma + Postgres for database storage
- Supabase Postgres can be used by changing `DATABASE_URL`
- Redis + BullMQ for worker-ready jobs
- Gemini API for relevance checking and post drafting
- Gmail API for inbox monitoring
- Facebook Graph API for page publishing
- Vitest for unit tests

## Project Structure

```text
src/app                  Dashboard and API routes
src/lib/ai               Gemini and fallback decision logic
src/lib/providers        Gmail, Google OAuth, and Facebook integrations
src/lib/scrapers         IOE page, web source, and search scrapers
src/lib/workflows        End-to-end automation pipeline
prisma/schema.prisma     Database schema
tests                    Unit tests
```

## Setup

Install dependencies:

```bash
npm install
```

Start local Postgres and Redis:

```bash
docker compose up -d
```

Copy the env template:

```bash
cp .env.example .env
```

Generate Prisma client and migrate the database:

```bash
npm run db:generate
npm run db:migrate
```

Add demo proposals:

```bash
npm run db:seed
```

Run the dashboard:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Run the background worker in another terminal:

```bash
npm run worker
```

## Environment Variables

The important values are already listed in `.env.example` and `.env`.

For local demo, the app works without Gemini, Gmail, or Facebook keys. Without Gemini, it uses the fallback rules. Without Facebook, approval will try to publish and then mark the proposal as failed with a clear error.

For real use, fill these:

```env
GEMINI_API_KEY=""
FACEBOOK_PAGE_ID=""
FACEBOOK_PAGE_ACCESS_TOKEN=""
GMAIL_CLIENT_ID=""
GMAIL_CLIENT_SECRET=""
GMAIL_REFRESH_TOKEN=""
DATABASE_URL=""
REDIS_URL=""
```

## Gmail Setup

1. Create OAuth credentials in Google Cloud.
2. Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REDIRECT_URI`.
3. Run the app with `npm run dev`.
4. Visit:

```text
http://localhost:3000/api/auth/google
```

5. Approve Gmail readonly access.
6. Copy the refresh token shown on the callback page into `GMAIL_REFRESH_TOKEN`.

The Gmail query can be changed with:

```env
GMAIL_QUERY="is:unread newer_than:14d (student OR exam OR result OR ioe OR notice OR problem)"
```

## Facebook Page Setup

Create a Meta app, connect the Facebook Page, and generate a Page access token with publishing permission. Then set:

```env
FACEBOOK_PAGE_ID=""
FACEBOOK_PAGE_ACCESS_TOKEN=""
FACEBOOK_GRAPH_VERSION="v23.0"
```

I kept the Facebook part as official API publishing. For monitoring other Facebook pages, this project uses configured source URLs and Google search instead of login-based scraping, because raw scraping of Facebook pages is unreliable and can break platform rules.

## Automation Schedule

The worker currently does this:

- Gmail check every 30 minutes
- IOE/source check at 7 AM, 12 PM, and 6 PM Nepal time
- Manual full run from the dashboard any time

These schedules are in:

```text
src/worker.ts
```

## API Routes

```text
GET  /api/health
POST /api/runs
GET  /api/proposals
POST /api/proposals/:id/approve
POST /api/proposals/:id/reject
GET  /api/auth/google
GET  /api/auth/google/callback
```

Example manual run:

```bash
curl -X POST http://localhost:3000/api/runs \
  -H "content-type: application/json" \
  -d '{"type":"full"}'
```

## Tests

```bash
npm test
```

## Resume Summary

Built an end-to-end AI automation platform for a student Facebook page using Next.js, Prisma, Gemini, Gmail API, and Meta Graph API. The system scrapes official notices, monitors inbox messages, deduplicates updates, uses AI to draft and classify posts, supports human approval, and publishes approved content through the Facebook Page API.
