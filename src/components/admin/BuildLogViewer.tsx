"use client";

import type { BuildLog } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STEP_ICONS: Record<string, string> = {
  analysing: "🔍",
  generating: "⚡",
  creating_repo: "📦",
  deploying: "🚀",
  delivered: "✅",
  error: "❌",
};

interface BuildLogViewerProps {
  logs: BuildLog[];
  className?: string;
}

export function BuildLogViewer({ logs, className }: BuildLogViewerProps) {
  if (!logs.length) {
    return <p className="text-arena-muted text-sm font-mono">No logs yet...</p>;
  }

  return (
    <div className={cn("space-y-1 font-mono text-sm", className)}>
      {logs.map((log, i) => (
        <div key={i} className="flex items-start gap-3 py-1.5 border-b border-arena-border/50 last:border-0">
          <span className="text-base shrink-0">{STEP_ICONS[log.step] ?? "•"}</span>
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                "font-medium",
                log.step === "delivered" ? "text-arena-accent" : log.step === "error" ? "text-arena-red" : "text-white"
              )}
            >
              [{log.step}]
            </span>{" "}
            <span className="text-arena-muted">{log.message}</span>
          </div>
          <time className="text-arena-muted text-xs shrink-0 tabular-nums">
            {format(new Date(log.timestamp), "HH:mm:ss")}
          </time>
        </div>
      ))}
    </div>
  );
}
