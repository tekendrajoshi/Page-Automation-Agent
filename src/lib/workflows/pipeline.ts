import { Prisma, ProposalStatus, RunStatus, RunType } from "@prisma/client";
import { evaluateAndDraft } from "@/lib/ai/gemini";
import { env } from "@/lib/config";
import { prisma } from "@/lib/db";
import { publishToFacebook } from "@/lib/providers/facebook";
import { fetchStudentEmails } from "@/lib/providers/gmail";
import { searchRecentIoeNews } from "@/lib/scrapers/googleSearch";
import { scrapeIoeExam } from "@/lib/scrapers/ioeExam";
import { scrapeConfiguredWebSources } from "@/lib/scrapers/webSources";
import type { PipelineResult, RawSourceItem } from "@/lib/types";
import { stableHash } from "@/lib/utils/hash";

export async function runFullAutomation(): Promise<PipelineResult> {
  return withRun("FULL", async () => {
    const [sources, emails] = await Promise.all([collectSourceItems(), fetchStudentEmails()]);
    return processRawItems([...sources, ...emails]);
  });
}

export async function runSourceAutomation(): Promise<PipelineResult> {
  return withRun("SOURCES", async () => processRawItems(await collectSourceItems()));
}

export async function runGmailAutomation(): Promise<PipelineResult> {
  return withRun("GMAIL", async () => processRawItems(await fetchStudentEmails()));
}

export async function collectSourceItems(): Promise<RawSourceItem[]> {
  const results = await Promise.allSettled([
    scrapeIoeExam(),
    scrapeConfiguredWebSources(),
    searchRecentIoeNews()
  ]);

  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

export async function processRawItems(items: RawSourceItem[]): Promise<PipelineResult> {
  let proposals = 0;
  let published = 0;

  for (const item of items) {
    const contentHash = stableHash({
      sourceType: item.sourceType,
      externalId: item.externalId,
      title: item.title,
      body: item.body
    });

    const sourceItem = await prisma.sourceItem.upsert({
      where: { contentHash },
      update: {
        title: item.title,
        body: item.body,
        imageUrl: item.imageUrl,
        sourceUrl: item.sourceUrl,
        rawJson: toJson(item.rawJson)
      },
      create: {
        sourceType: item.sourceType,
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        externalId: item.externalId,
        title: item.title,
        body: item.body,
        imageUrl: item.imageUrl,
        rawJson: toJson(item.rawJson),
        contentHash
      },
      include: { proposals: true }
    });

    if (sourceItem.proposals.length > 0) continue;

    const decision = await evaluateAndDraft(item);
    if (!decision.relevant) continue;

    const proposal = await prisma.postProposal.create({
      data: {
        sourceItemId: sourceItem.id,
        status: shouldAutoPublish(decision.confidence)
          ? ProposalStatus.APPROVED
          : ProposalStatus.NEEDS_REVIEW,
        category: decision.category,
        relevanceScore: decision.relevanceScore,
        confidence: decision.confidence,
        title: decision.title,
        caption: decision.caption,
        imageUrl: item.imageUrl,
        reason: decision.reason,
        safetyNotes: decision.safetyNotes,
        suggestedPublishAt: decision.suggestedPublishAt ? new Date(decision.suggestedPublishAt) : undefined
      }
    });

    proposals += 1;

    if (proposal.status === ProposalStatus.APPROVED) {
      const result = await publishProposal(proposal.id, "system-auto-publish");
      if (result.status === ProposalStatus.PUBLISHED) published += 1;
    }
  }

  return { itemsSeen: items.length, proposals, published };
}

export async function approveProposal(id: string, actorEmail?: string | null) {
  const proposal = await prisma.postProposal.update({
    where: { id },
    data: {
      status: ProposalStatus.APPROVED,
      approvedAt: new Date(),
      approvals: {
        create: {
          action: "APPROVED",
          actorEmail
        }
      }
    }
  });

  return publishProposal(proposal.id, actorEmail ?? "admin");
}

export async function rejectProposal(id: string, actorEmail?: string | null, note?: string) {
  return prisma.postProposal.update({
    where: { id },
    data: {
      status: ProposalStatus.REJECTED,
      rejectedAt: new Date(),
      approvals: {
        create: {
          action: "REJECTED",
          actorEmail,
          note
        }
      }
    }
  });
}

export async function publishProposal(id: string, actorEmail?: string | null) {
  const proposal = await prisma.postProposal.findUniqueOrThrow({ where: { id } });

  try {
    const result = await publishToFacebook(proposal.caption, proposal.imageUrl ?? undefined);
    return prisma.postProposal.update({
      where: { id },
      data: {
        status: ProposalStatus.PUBLISHED,
        facebookPostId: result.id,
        publishedAt: new Date(),
        errorMessage: null,
        approvals: {
          create: {
            action: "PUBLISHED",
            actorEmail
          }
        }
      }
    });
  } catch (error) {
    return prisma.postProposal.update({
      where: { id },
      data: {
        status: ProposalStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : "Unknown publish error",
        approvals: {
          create: {
            action: "PUBLISH_FAILED",
            actorEmail,
            note: error instanceof Error ? error.message : "Unknown publish error"
          }
        }
      }
    });
  }
}

async function withRun(type: RunType, action: () => Promise<PipelineResult>) {
  const run = await prisma.automationRun.create({ data: { type } });

  try {
    const result = await action();
    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: RunStatus.SUCCESS,
        finishedAt: new Date(),
        itemsSeen: result.itemsSeen,
        proposals: result.proposals,
        published: result.published
      }
    });
    return result;
  } catch (error) {
    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: RunStatus.FAILED,
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : "Unknown automation error"
      }
    });
    throw error;
  }
}

function shouldAutoPublish(confidence: number) {
  return env.AUTO_PUBLISH && confidence >= env.MIN_CONFIDENCE_TO_AUTO_PUBLISH;
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}
