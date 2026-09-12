import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Database, Facebook, Inbox, ShieldCheck, Sparkles } from "lucide-react";
import { Prisma, ProposalStatus } from "@prisma/client";
import { ActionButton } from "@/app/components/ActionButton";
import { hasFacebookConfig, hasGmailConfig } from "@/lib/config";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await loadDashboard();

  return (
    <main>
      <section className="topbar">
        <div>
          <p className="eyebrow">IOE student page operations</p>
          <h1>Page Automation Agent</h1>
        </div>
        <div className="runActions">
          <ActionButton action="run" runType="sources" label="Check Sources" />
          <ActionButton action="run" runType="gmail" label="Check Gmail" />
          <ActionButton action="run" runType="full" label="Run Full Agent" />
        </div>
      </section>

      {data.error ? (
        <section className="notice danger">
          <AlertTriangle size={18} />
          <span>{data.error}</span>
        </section>
      ) : null}

      <section className="statusGrid">
        <StatusItem icon={<Database size={18} />} label="Database" value={data.error ? "Needs setup" : "Ready"} />
        <StatusItem icon={<Sparkles size={18} />} label="Gemini" value={process.env.GEMINI_API_KEY ? "Connected" : "Fallback mode"} />
        <StatusItem icon={<Facebook size={18} />} label="Facebook" value={hasFacebookConfig() ? "Connected" : "Needs token"} />
        <StatusItem icon={<Inbox size={18} />} label="Gmail" value={hasGmailConfig() ? "Connected" : "Needs OAuth"} />
      </section>

      <section className="metricGrid">
        <Metric label="Pending review" value={data.pendingCount} />
        <Metric label="Published" value={data.publishedCount} />
        <Metric label="Failed" value={data.failedCount} />
        <Metric label="Runs logged" value={data.runs.length} />
      </section>

      <section className="layout">
        <div className="panel proposalPanel">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">AI drafted posts</p>
              <h2>Approval Queue</h2>
            </div>
            <ShieldCheck size={22} />
          </div>

          {data.proposals.length === 0 ? (
            <div className="emptyState">
              Run the agent to pull IOE notices, configured source URLs, Google search results, and Gmail messages.
            </div>
          ) : (
            <div className="proposalList">
              {data.proposals.map((proposal) => (
                <article className="proposal" key={proposal.id}>
                  <div className="proposalTop">
                    <div>
                      <span className={`badge ${proposal.status.toLowerCase()}`}>{proposal.status.replace("_", " ")}</span>
                      <h3>{proposal.title}</h3>
                    </div>
                    <div className="score">{Math.round(proposal.confidence * 100)}%</div>
                  </div>

                  <p className="caption">{proposal.caption}</p>

                  <div className="details">
                    <span>{proposal.category.replaceAll("_", " ")}</span>
                    <span>{proposal.sourceItem?.sourceName ?? "Manual"}</span>
                    <span>{formatDistanceToNow(proposal.createdAt, { addSuffix: true })}</span>
                  </div>

                  <p className="reason">{proposal.reason}</p>
                  {proposal.safetyNotes ? <p className="safety">{proposal.safetyNotes}</p> : null}
                  {proposal.errorMessage ? <p className="safety">{proposal.errorMessage}</p> : null}

                  {proposal.sourceItem?.sourceUrl ? (
                    <a className="sourceLink" href={proposal.sourceItem.sourceUrl} target="_blank" rel="noreferrer">
                      Open source
                    </a>
                  ) : null}

                  {proposal.status === ProposalStatus.NEEDS_REVIEW || proposal.status === ProposalStatus.FAILED ? (
                    <div className="proposalActions">
                      <ActionButton action="approve" proposalId={proposal.id} label="Approve and Post" />
                      <ActionButton action="reject" proposalId={proposal.id} label="Reject" />
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="panel runPanel">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Background activity</p>
              <h2>Recent Runs</h2>
            </div>
          </div>

          <div className="runList">
            {data.runs.length === 0 ? (
              <div className="emptyState compact">No runs yet.</div>
            ) : (
              data.runs.map((run) => (
                <div className="runItem" key={run.id}>
                  <div>
                    <strong>{run.type}</strong>
                    <span>{formatDistanceToNow(run.startedAt, { addSuffix: true })}</span>
                  </div>
                  <span className={`badge ${run.status.toLowerCase()}`}>{run.status}</span>
                  <small>
                    {run.itemsSeen} seen, {run.proposals} drafted, {run.published} posted
                  </small>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function StatusItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="statusItem">
      {icon}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

async function loadDashboard() {
  try {
    const [proposals, runs, grouped] = await Promise.all([
      prisma.postProposal.findMany({
        orderBy: { createdAt: "desc" },
        include: { sourceItem: true },
        take: 25
      }),
      prisma.automationRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 8
      }),
      prisma.postProposal.groupBy({
        by: ["status"],
        _count: { status: true }
      })
    ]);

    const count = (status: ProposalStatus) =>
      grouped.find((item) => item.status === status)?._count.status ?? 0;

    return {
      proposals,
      runs,
      pendingCount: count(ProposalStatus.NEEDS_REVIEW),
      publishedCount: count(ProposalStatus.PUBLISHED),
      failedCount: count(ProposalStatus.FAILED),
      error: null
    };
  } catch (error) {
    return {
      proposals: [] as Prisma.PostProposalGetPayload<{ include: { sourceItem: true } }>[],
      runs: [],
      pendingCount: 0,
      publishedCount: 0,
      failedCount: 0,
      error:
        error instanceof Error
          ? `Database is not ready yet: ${error.message}`
          : "Database is not ready yet."
    };
  }
}
