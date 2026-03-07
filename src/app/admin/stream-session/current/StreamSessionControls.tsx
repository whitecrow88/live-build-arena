"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { StreamSession } from "@/types";

export function StreamSessionControls({ session }: { session: StreamSession | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("Live Build Session");

  async function startSession() {
    setLoading("start");
    const db = createClient();
    const { error } = await db.from("stream_sessions").insert({
      title: newTitle,
      status: "live",
      started_at: new Date().toISOString(),
    });
    if (error) toast.error("Failed: " + error.message);
    else { toast.success("Session started!"); router.refresh(); }
    setLoading(null);
  }

  async function endSession() {
    if (!session) return;
    if (!confirm("End the current stream session?")) return;
    setLoading("end");
    const db = createClient();
    const { error } = await db
      .from("stream_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", session.id);
    if (error) toast.error("Failed: " + error.message);
    else { toast.success("Session ended"); router.refresh(); }
    setLoading(null);
  }

  async function toggleIntake() {
    if (!session) return;
    setLoading("intake");
    const db = createClient();
    const { error } = await db
      .from("stream_sessions")
      .update({ intake_paused: !session.intake_paused })
      .eq("id", session.id);
    if (error) toast.error("Failed: " + error.message);
    else { toast.success(session.intake_paused ? "Intake resumed" : "Intake paused"); router.refresh(); }
    setLoading(null);
  }

  if (!session) {
    return (
      <Card>
        <p className="text-arena-muted text-sm mb-3">No active session. Start a new one.</p>
        <div className="flex gap-3 items-center">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 bg-arena-bg border border-arena-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-arena-accent"
            placeholder="Session title..."
          />
          <Button variant="primary" loading={loading === "start"} onClick={startSession}>
            ◉ Go Live
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-arena-accent/20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-arena-accent animate-pulse" />
          <span className="font-semibold text-white">{session.title}</span>
          <span className="text-xs text-arena-muted font-mono ml-2">LIVE</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={session.intake_paused ? "primary" : "outline"}
            loading={loading === "intake"}
            onClick={toggleIntake}
          >
            {session.intake_paused ? "▶ Resume Intake" : "⏸ Pause Intake"}
          </Button>
          <Button size="sm" variant="danger" loading={loading === "end"} onClick={endSession}>
            ◼ End Session
          </Button>
        </div>
      </div>
    </Card>
  );
}
