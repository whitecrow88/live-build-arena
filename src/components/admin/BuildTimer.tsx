"use client";

import { useEffect, useState } from "react";
import { formatTime, cn } from "@/lib/utils";

interface BuildTimerProps {
  startedAt: string;
  timeCap: number; // in seconds
  className?: string;
  large?: boolean;
}

export function BuildTimer({ startedAt, timeCap, className, large }: BuildTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const calc = () =>
      Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    setElapsed(calc());

    const interval = setInterval(() => {
      setElapsed(calc());
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  const remaining = Math.max(0, timeCap - elapsed);
  const pct = Math.min(100, (elapsed / timeCap) * 100);
  const isWarning = remaining < 120; // < 2 min
  const isDanger = remaining < 30;
  const isExpired = remaining === 0;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "font-mono font-bold tabular-nums transition-colors",
          large ? "text-6xl" : "text-3xl",
          isExpired
            ? "text-arena-red animate-pulse"
            : isWarning
            ? "text-arena-amber"
            : "text-arena-accent"
        )}
      >
        {isExpired ? "TIME" : formatTime(remaining)}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-arena-border rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000",
            isDanger ? "bg-arena-red" : isWarning ? "bg-arena-amber" : "bg-arena-accent"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className={cn("text-xs font-mono", isWarning ? "text-arena-amber" : "text-arena-muted")}>
        {elapsed}s elapsed / {timeCap}s cap
      </p>
    </div>
  );
}
