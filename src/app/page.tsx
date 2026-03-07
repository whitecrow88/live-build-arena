import type { Metadata } from "next";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://streamcoder.live",
  },
};

async function getRecentBuilds() {
  const db = createServiceClient();
  const { data } = await db
    .from("requests")
    .select("id, donor_name, requested_scope, amount, currency, created_at, public_token")
    .eq("status", "delivered")
    .order("created_at", { ascending: false })
    .limit(6);
  return data ?? [];
}

async function getLiveSession() {
  const db = createServiceClient();
  const { data } = await db
    .from("stream_sessions")
    .select("id, status")
    .eq("status", "live")
    .maybeSingle();
  return data;
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [recentBuilds, liveSession] = await Promise.all([
    getRecentBuilds(),
    getLiveSession(),
  ]);

  return (
    <div className="min-h-screen bg-arena-bg text-white font-sans">
      {/* Nav */}
      <nav className="border-b border-arena-border px-6 py-4 flex items-center justify-between">
        <span className="font-mono font-bold text-arena-accent text-lg tracking-tight">StreamCoder.live</span>
        <div className="flex items-center gap-4">
          {liveSession && (
            <span className="flex items-center gap-2 text-xs font-mono text-red-400 bg-red-950/40 border border-red-700/50 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE NOW
            </span>
          )}
          <a
            href="https://www.twitch.tv/streamcoderlive"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-4 py-2 rounded-lg border border-arena-accent text-arena-accent hover:bg-arena-accent hover:text-black transition-colors font-semibold"
          >
            Watch Stream
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 text-xs font-mono text-arena-accent bg-arena-accent/10 border border-arena-accent/30 px-4 py-2 rounded-full mb-8">
          AI builds shipped live on stream
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Donate. Get a{" "}
          <span className="text-arena-accent">working app</span>{" "}
          built live.
        </h1>
        <p className="text-arena-muted text-lg leading-relaxed mb-10">
          Watch the stream, drop a donation with your idea, and get a real
          AI-built prototype — GitHub repo + live preview — delivered in 15 minutes.
        </p>
        <a
          href="https://www.twitch.tv/streamcoderlive"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-8 py-4 bg-arena-accent text-black font-bold text-lg rounded-xl hover:bg-arena-accent/90 active:scale-95 transition-all"
        >
          Watch &amp; Request a Build
        </a>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Watch the stream",
              desc: "Tune in live on Twitch. See real apps being built in real time.",
            },
            {
              step: "02",
              title: "Donate your idea",
              desc: "Drop a donation with your app idea as the message. Any amount unlocks a build.",
            },
            {
              step: "03",
              title: "Get your app",
              desc: "Within 15 minutes: GitHub repo + live Vercel preview delivered to you via chat.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="rounded-xl border border-arena-border bg-arena-surface p-6">
              <div className="text-arena-accent font-mono text-sm font-bold mb-3">{step}</div>
              <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
              <p className="text-arena-muted text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-4">What you get</h2>
        <p className="text-arena-muted text-center text-sm mb-12">Every build includes the basics free. Upgrade to keep it running.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-arena-border bg-arena-surface p-6">
            <p className="text-xs font-mono text-arena-muted uppercase tracking-wider mb-3">Included free</p>
            <h3 className="font-bold text-xl mb-1">GitHub Repo</h3>
            <p className="text-arena-muted text-sm mb-4">Full source code on GitHub. Fork it and it&apos;s yours forever.</p>
            <p className="text-arena-accent font-bold text-lg">Free</p>
          </div>
          <div className="rounded-xl border border-arena-border bg-arena-surface p-6">
            <p className="text-xs font-mono text-arena-muted uppercase tracking-wider mb-3">7 days free</p>
            <h3 className="font-bold text-xl mb-1">Live Preview</h3>
            <p className="text-arena-muted text-sm mb-4">Hosted Vercel preview so you can click around immediately. Auto-expires after 7 days.</p>
            <p className="text-arena-accent font-bold text-lg">Free for 7 days</p>
          </div>
          <div className="rounded-xl border border-purple-700/50 bg-purple-950/20 p-6">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-mono text-purple-400 uppercase tracking-wider">Paid add-on</p>
              <span className="text-xs bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700/40">Coming Soon</span>
            </div>
            <h3 className="font-bold text-xl mb-1 text-purple-200">Permanent Hosting</h3>
            <p className="text-purple-400/70 text-sm mb-4">Keep your app live forever on a subdomain or your own custom domain.</p>
            <p className="text-purple-300 font-bold text-lg">From $4.99/mo</p>
          </div>
        </div>

        {/* Edit requests */}
        <div className="mt-6 rounded-xl border border-arena-border bg-arena-surface p-6 flex items-center gap-6">
          <div className="w-12 h-12 rounded-lg bg-arena-bg border border-arena-border flex items-center justify-center text-2xl shrink-0">
            ✏️
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white mb-1">Edit Requests — $1 each</h3>
            <p className="text-arena-muted text-sm">Not happy with the output? Request up to 5 targeted edits for $1 each via Stripe. Changes applied and redeployed within minutes.</p>
          </div>
          <span className="text-xs bg-arena-accent/10 text-arena-accent px-3 py-1.5 rounded-full border border-arena-accent/30 font-mono shrink-0">$1 / edit</span>
        </div>
      </section>

      {/* Recent builds */}
      {recentBuilds.length > 0 && (
        <section className="px-6 py-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">Recent builds</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentBuilds.map((build) => (
              <Link
                key={build.id}
                href={`/delivery/${build.public_token}`}
                className="rounded-xl border border-arena-border bg-arena-surface p-5 hover:border-arena-accent transition-colors group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-semibold text-white text-sm line-clamp-2 flex-1">{build.requested_scope}</p>
                  <span className="text-arena-accent group-hover:translate-x-0.5 transition-transform shrink-0">→</span>
                </div>
                <p className="text-xs text-arena-muted font-mono">
                  by {build.donor_name} · {new Intl.NumberFormat("en-US", { style: "currency", currency: build.currency ?? "USD" }).format((build.amount ?? 0) / 100)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-arena-border px-6 py-8 text-center text-xs text-arena-muted font-mono space-y-2">
        <p>StreamCoder.live · AI-generated prototypes built live on stream · Use at your own risk</p>
        <p>
          Questions?{" "}
          <a
            href="https://discord.com/users/john_40902"
            target="_blank"
            rel="noopener noreferrer"
            className="text-arena-accent hover:underline"
          >
            Discord: john_40902
          </a>
        </p>
      </footer>
    </div>
  );
}
