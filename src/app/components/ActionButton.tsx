"use client";

import { Check, Loader2, RefreshCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";

type ActionButtonProps = {
  action: "approve" | "reject" | "run";
  proposalId?: string;
  runType?: "full" | "sources" | "gmail";
  label: string;
};

export function ActionButton({ action, proposalId, runType = "full", label }: ActionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function execute() {
    setLoading(true);
    try {
      const url =
        action === "run"
          ? "/api/runs"
          : `/api/proposals/${proposalId}/${action === "approve" ? "approve" : "reject"}`;

      await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action === "run" ? { type: runType } : {})
      });

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const Icon = loading ? Loader2 : action === "approve" ? Check : action === "reject" ? X : RefreshCcw;

  return (
    <button
      className={clsx("actionButton", action)}
      onClick={execute}
      disabled={loading}
      title={label}
      type="button"
    >
      <Icon size={16} className={loading ? "spin" : undefined} />
      <span>{label}</span>
    </button>
  );
}
