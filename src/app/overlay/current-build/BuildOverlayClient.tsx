"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatTime, formatAmount, cn, truncate } from "@/lib/utils";
import type { BuildJob, Request } from "@/types";

const STEP_LABELS: Record<string, string> = {
  analysing: "Analysing request",
  generating: "Generating code",
  creating_repo: "Creating repo",
  deploying: "Deploying preview",
  delivered: "Delivered!",
  error: "Error",
};

const STEP_ORDER = ["analysing", "generating", "creating_repo", "deploying", "delivered"];

interface BuildOverlayClientProps {
  buildJob: BuildJob;
  request: Pick<Request, "id" | "donor_name" | "requested_scope" | "amount" | "currency">;
  initialElapsed: number;
  timeCap: number;
}

export function BuildOverlayClient({
  buildJob: initialJob,
  request,
  initialElapsed,
  timeCap,
}: BuildOverlayClientProps) {
  const [job, setJob] = useState(initialJob);
  const [elapsed, setElapsed] = useState(initialElapsed);
  const [justDelivered, setJustDelivered] = useState(false);
  const prevStatus = useRef(initialJob.build_status);

  // Tick timer
  useEffect(() => {
    if (job.build_status === "success" || job.build_status === "failed") return;
    const tick = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(tick);
  }, [job.build_status]);

  // Supabase Realtime — listen for build_job updates
  useEffect(() => {
    const db = createClient();
    const channel = db
      .channel(`build-overlay-${job.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "build_jobs",
          filter: `id=eq.${job.id}`,
        },
        (payload) => {
          const updated = payload.new as BuildJob;
          setJob(updated);

          // Delivery celebration
          if (
            prevStatus.current !== "success" &&
            updated.build_status === "success"
          ) {
            setJustDelivered(true);
            playDeliveredSound();
            setTimeout(() => setJustDelivered(false), 3000);
          }
          prevStatus.current = updated.build_status;
        }
      )
      .subscribe();

    return () => { db.removeChannel(channel); };
  }, [job.id]);

  function playDeliveredSound() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      // Victory fanfare: C E G C
      [261.63, 329.63, 392.0, 523.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "triangle";
        const start = ctx.currentTime + i * 0.14;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
        osc.start(start);
        osc.stop(start + 0.5);
      });
    } catch { /* noop */ }
  }

  const logs = job.logs ?? [];
  const currentStep = logs.length > 0 ? logs[logs.length - 1].step : "analysing";
  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  const remaining = Math.max(0, timeCap - elapsed);
  const pct = Math.min(100, (elapsed / timeCap) * 100);
  const isWarning = remaining < 120;
  const isDanger = remaining < 30;
  const isDelivered = job.build_status === "success";
  const isFailed = job.build_status === "failed";

  return (
    <div
      className={cn(
        "rounded-3xl border backdrop-blur-md overflow-hidden transition-all duration-500",
        justDelivered
          ? "border-arena-accent animate-delivered bg-black/80"
          : isDelivered
          ? "border-arena-accent/40 bg-black/70 animate-glow-green"
          : isFailed
          ? "border-arena-red/40 bg-black/70 animate-glow-red"
          : isDanger
          ? "border-arena-red/50 bg-black/75 animate-glow-red"
          : isWarning
          ? "border-arena-amber/40 bg-black/75 animate-glow-amber"
          : "border-white/10 bg-black/70"
      )}
    >
      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 border-b border-white/8 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-arena-accent font-mono text-[10px] font-bold uppercase tracking-[0.25em] mb-0.5">
            Building for
          </p>
          <h2 className="text-white font-bold text-xl leading-tight truncate overlay-safe">
            {request.donor_name}
          </h2>
          <p className="text-white/55 text-xs mt-0.5 truncate">
            {truncate(request.requested_scope ?? "", 72)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span
            className={cn(
              "font-mono font-bold text-3xl overlay-safe",
              isDelivered ? "text-arena-accent" : "text-arena-amber"
            )}
          >
            {formatAmount(request.amount, request.currency)}
          </span>
        </div>
      </div>

      {/* ── Main body ───────────────────────────────────── */}
      <div className="px-5 py-4 flex items-center gap-5">

        {/* Timer block */}
        <div className="shrink-0 flex flex-col items-center gap-2" style={{ minWidth: 140 }}>
          {isDelivered ? (
            <div className={cn(
              "font-mono font-black text-5xl tracking-tight overlay-safe",
              justDelivered ? "text-arena-accent animate-pulse" : "text-arena-accent"
            )}>
              DONE ✓
            </div>
          ) : isFailed ? (
            <div className="font-mono font-black text-5xl text-arena-red overlay-safe animate-pulse">
              FAILED
            </div>
          ) : (
            <div
              className={cn(
                "font-mono font-black tabular-nums overlay-safe transition-colors leading-none",
                isDanger
                  ? "text-7xl animate-glow-red animate-timer-warn"
                  : isWarning
                  ? "text-7xl animate-timer-warn text-arena-amber"
                  : "text-7xl text-white"
              )}
            >
              {formatTime(remaining)}
            </div>
          )}

          {/* Progress bar */}
          {!isDelivered && !isFailed && (
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  isDanger ? "bg-arena-red" : isWarning ? "bg-arena-amber" : "bg-arena-accent"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          <p className="text-white/30 text-[10px] font-mono">
            {isDelivered
              ? "Build complete"
              : isFailed
              ? "Build failed"
              : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s elapsed`}
          </p>
        </div>

        {/* Step progress */}
        <div className="flex-1 space-y-2">
          {STEP_ORDER.map((step, i) => {
            const done = i < currentStepIndex || isDelivered;
            const active = i === currentStepIndex && !isDelivered && !isFailed;

            return (
              <div
                key={step}
                className={cn(
                  "flex items-center gap-2.5 transition-all duration-300",
                  done || active ? "opacity-100" : "opacity-25"
                )}
              >
                {/* Step dot */}
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all",
                    done
                      ? "bg-arena-accent text-arena-bg"
                      : active
                      ? "bg-arena-amber text-arena-bg"
                      : "bg-white/10 text-white/20"
                  )}
                >
                  {done ? "✓" : active ? "▶" : i + 1}
                </div>

                {/* Step label */}
                <span
                  className={cn(
                    "font-mono text-xs font-medium",
                    done
                      ? "text-arena-accent"
                      : active
                      ? "text-arena-amber"
                      : "text-white/25"
                  )}
                >
                  {STEP_LABELS[step]}
                </span>

                {/* Active spinner */}
                {active && (
                  <span className="w-2 h-2 rounded-full bg-arena-amber animate-pulse shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Delivery bar ────────────────────────────────── */}
      {isDelivered && job.repo_url && (
        <div
          className={cn(
            "px-5 py-3 border-t border-arena-accent/20 flex items-center gap-4",
            justDelivered ? "animate-new-item" : "bg-arena-accent/5"
          )}
        >
          <span className="text-arena-accent font-mono text-xs font-bold uppercase tracking-widest">
            Delivered
          </span>
          <a
            href={job.repo_url}
            className="text-arena-accent text-xs font-mono hover:underline truncate"
          >
            📦 {job.repo_url.replace("https://github.com/", "")}
          </a>
          {job.preview_url && (
            <a
              href={job.preview_url}
              className="text-arena-accent text-xs font-mono hover:underline shrink-0"
            >
              🚀 Preview →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
