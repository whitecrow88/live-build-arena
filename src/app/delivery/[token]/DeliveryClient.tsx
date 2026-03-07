"use client";

import { useState, useEffect } from "react";

interface BuildJob {
  build_status: string;
  repo_url: string | null;
  preview_url: string | null;
  finished_at: string | null;
}

interface DeliveryClientProps {
  donorName: string;
  requestedScope: string;
  amount: number;
  currency: string;
  buildJob: BuildJob;
  refundPolicyText: string | null;
}

function useCountdown(expiresAt: Date) {
  const [timeLeft, setTimeLeft] = useState(() => expiresAt.getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(expiresAt.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const totalSeconds = Math.max(0, Math.floor(timeLeft / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const expired = timeLeft <= 0;

  return { days, hours, minutes, seconds, expired };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function DeliveryClient({
  donorName,
  requestedScope,
  buildJob,
  refundPolicyText,
}: DeliveryClientProps) {
  const [accepted, setAccepted] = useState(false);

  const finishedAt = buildJob.finished_at ? new Date(buildJob.finished_at) : new Date();
  const expiresAt = new Date(finishedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { days, hours, minutes, seconds, expired } = useCountdown(expiresAt);

  // Parse GitHub fork URL from repo_url
  const forkUrl = buildJob.repo_url
    ? buildJob.repo_url.replace("https://github.com/", "https://github.com/") + "/fork"
    : null;

  const tickerText = expired
    ? "⚠️ This preview has expired and been deleted. Fork the repo to keep your code.  "
    : `⏳ Preview expires in ${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s — fork the repo to keep your code permanently   ·   ⏳ Preview expires in ${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s — fork the repo to keep your code permanently   ·   `;

  if (!accepted) {
    return (
      <div className="min-h-screen bg-arena-bg flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-arena-border bg-arena-surface p-8 space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-yellow-500/10 border-2 border-yellow-500/50 flex items-center justify-center text-2xl mx-auto mb-4">
                ⚠️
              </div>
              <h1 className="text-2xl font-bold text-white">Before You Continue</h1>
              <p className="text-arena-muted text-sm mt-2">Please read and accept these terms</p>
            </div>

            <div className="rounded-xl bg-arena-bg border border-arena-border p-5 space-y-4 text-sm text-arena-muted leading-relaxed">
              <p>
                <span className="text-white font-semibold">This is AI-generated prototype code</span>{" "}
                built live on stream under a 15-minute time cap. It is delivered as an experimental
                prototype only.
              </p>
              <p>
                <span className="text-white font-semibold">No warranties.</span> The code is
                provided as-is with no guarantee of fitness for any purpose, security, or
                production-readiness. Use at your own risk.
              </p>
              <p>
                <span className="text-white font-semibold">7-day preview hosting.</span> The live
                preview will be automatically deleted 7 days after delivery. The GitHub repository
                remains available unless you delete it.
              </p>
              <p>
                <span className="text-white font-semibold">External links.</span> Clicking links
                will take you to third-party services (GitHub, Vercel). We are not responsible for
                any content hosted there.
              </p>
              {refundPolicyText && <p>{refundPolicyText}</p>}
            </div>

            <button
              onClick={() => setAccepted(true)}
              className="w-full py-4 rounded-xl bg-arena-accent text-black font-bold text-base hover:bg-arena-accent/90 active:scale-95 transition-all"
            >
              I Understand & Accept — Show My Build
            </button>

            <p className="text-center text-xs text-arena-muted">
              By continuing you agree to the terms above
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arena-bg">
      {/* Scrolling countdown banner */}
      <div className={`w-full overflow-hidden py-2 ${expired ? "bg-red-900/80 border-b border-red-700" : "bg-arena-accent/10 border-b border-arena-accent/30"}`}>
        <div className="whitespace-nowrap animate-marquee inline-block text-sm font-mono">
          <span className={expired ? "text-red-300" : "text-arena-accent"}>
            {tickerText}{tickerText}
          </span>
        </div>
      </div>

      <div className="flex items-start justify-center p-6 pt-8">
        <div className="w-full max-w-2xl space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-arena-accent/10 border-2 border-arena-accent flex items-center justify-center text-3xl mx-auto mb-4">
              🚀
            </div>
            <h1 className="text-3xl font-bold text-white">Your Build is Ready!</h1>
            <p className="text-arena-muted text-sm mt-2">Built live on stream for {donorName}</p>
          </div>

          {/* Countdown */}
          {!expired ? (
            <div className="rounded-xl border border-arena-accent/30 bg-arena-surface p-5">
              <p className="text-xs text-arena-muted font-mono uppercase tracking-wider mb-3 text-center">
                Preview expires in
              </p>
              <div className="flex justify-center gap-4">
                {[["Days", days], ["Hours", hours], ["Mins", minutes], ["Secs", seconds]].map(([label, val]) => (
                  <div key={label as string} className="text-center">
                    <div className="text-3xl font-bold font-mono text-arena-accent w-14 h-14 rounded-lg bg-arena-bg border border-arena-border flex items-center justify-center">
                      {pad(val as number)}
                    </div>
                    <p className="text-xs text-arena-muted mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-red-700 bg-red-950/30 p-4 text-center">
              <p className="text-red-400 font-semibold">Preview Expired</p>
              <p className="text-red-400/70 text-sm mt-1">The live preview has been deleted. Your GitHub repo is still available.</p>
            </div>
          )}

          {/* Request summary */}
          <div className="rounded-xl border border-arena-border bg-arena-surface p-5">
            <p className="text-xs text-arena-muted font-mono uppercase tracking-wider mb-2">What was built</p>
            <p className="text-white leading-relaxed">{requestedScope}</p>
          </div>

          {/* CTAs */}
          <div className="grid gap-4">
            {/* GitHub - always available */}
            {buildJob.repo_url && (
              <a
                href={buildJob.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 rounded-xl border border-arena-border hover:border-arena-accent bg-arena-surface transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-arena-bg border border-arena-border flex items-center justify-center text-2xl shrink-0">
                  📦
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white">View GitHub Repository</p>
                  <p className="text-arena-muted text-xs font-mono truncate mt-0.5">{buildJob.repo_url}</p>
                </div>
                <span className="text-arena-accent group-hover:translate-x-1 transition-transform text-xl shrink-0">→</span>
              </a>
            )}

            {/* Fork - free */}
            {forkUrl && (
              <a
                href={forkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 rounded-xl border border-green-700/50 hover:border-green-500 bg-green-950/20 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-green-950/40 border border-green-700/50 flex items-center justify-center text-2xl shrink-0">
                  🍴
                </div>
                <div className="flex-1">
                  <p className="font-bold text-green-300">Fork to Your GitHub — Free</p>
                  <p className="text-green-400/70 text-xs mt-0.5">Copy the full repo to your account. Yours forever, no expiry.</p>
                </div>
                <span className="text-green-400 group-hover:translate-x-1 transition-transform text-xl shrink-0">→</span>
              </a>
            )}

            {/* Live preview */}
            {buildJob.preview_url && !expired && (
              <a
                href={buildJob.preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 rounded-xl border border-blue-700/50 hover:border-blue-500 bg-blue-950/20 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-950/40 border border-blue-700/50 flex items-center justify-center text-2xl shrink-0">
                  🌐
                </div>
                <div className="flex-1">
                  <p className="font-bold text-blue-300">Open Live Preview</p>
                  <p className="text-blue-400/70 text-xs mt-0.5">Hosted on Vercel · Expires in {days}d {pad(hours)}h</p>
                </div>
                <span className="text-blue-400 group-hover:translate-x-1 transition-transform text-xl shrink-0">→</span>
              </a>
            )}

            {/* Permanent hosting - coming soon */}
            <div className="flex items-center gap-4 p-5 rounded-xl border border-purple-700/30 bg-purple-950/10 opacity-75 cursor-not-allowed">
              <div className="w-12 h-12 rounded-lg bg-purple-950/40 border border-purple-700/30 flex items-center justify-center text-2xl shrink-0">
                ⚡
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-purple-300">Permanent Hosting + Custom Domain</p>
                  <span className="text-xs bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700/40">Coming Soon</span>
                </div>
                <p className="text-purple-400/60 text-xs mt-0.5">Auto-deploy to your own domain. Never expires.</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-arena-muted pb-6">
            Built live on stream by{" "}
            <span className="text-arena-accent font-mono">Live Build Arena</span>
            {" · "}AI-generated prototype — use at your own risk
          </p>
        </div>
      </div>
    </div>
  );
}
