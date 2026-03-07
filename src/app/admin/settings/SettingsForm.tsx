"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { Policy } from "@/types";

export function SettingsForm({ policy }: { policy: Policy | null }) {
  const [maxMinutes, setMaxMinutes] = useState(policy?.max_build_minutes ?? 15);
  const [refundText, setRefundText] = useState(policy?.refund_policy_text ?? "");
  const [oneRevision, setOneRevision] = useState(policy?.one_revision_enabled ?? true);
  const [autoStart, setAutoStart] = useState(policy?.auto_start_on_approve ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const db = createClient();
    const { error } = await db.from("policies").upsert({
      id: 1,
      max_build_minutes: maxMinutes,
      refund_policy_text: refundText,
      one_revision_enabled: oneRevision,
      auto_start_on_approve: autoStart,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Settings saved");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Build Policy</CardTitle>
        </CardHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Max Build Minutes: <span className="text-arena-accent font-mono">{maxMinutes} min</span>
            </label>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={maxMinutes}
              onChange={(e) => setMaxMinutes(Number(e.target.value))}
              className="w-full accent-[#6EE7B7]"
            />
            <div className="flex justify-between text-xs text-arena-muted font-mono mt-1">
              <span>5m</span><span>30m</span><span>60m</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">One revision included</p>
              <p className="text-xs text-arena-muted">Allow buyers to request one revision</p>
            </div>
            <button
              onClick={() => setOneRevision(!oneRevision)}
              className={`w-12 h-6 rounded-full transition-colors ${oneRevision ? "bg-arena-accent" : "bg-arena-border"}`}
            >
              <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${oneRevision ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Auto-start build on approve</p>
              <p className="text-xs text-arena-muted">Automatically starts build when request is approved</p>
            </div>
            <button
              onClick={() => setAutoStart(!autoStart)}
              className={`w-12 h-6 rounded-full transition-colors ${autoStart ? "bg-arena-accent" : "bg-arena-border"}`}
            >
              <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${autoStart ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Refund Policy Text</CardTitle>
        </CardHeader>
        <textarea
          value={refundText}
          onChange={(e) => setRefundText(e.target.value)}
          rows={4}
          className="w-full bg-arena-bg border border-arena-border rounded-lg p-3 text-sm text-white font-mono focus:outline-none focus:border-arena-accent resize-none"
        />
        <p className="text-xs text-arena-muted mt-1">Shown on delivery pages and rejection notices.</p>
      </Card>

      <Button variant="primary" loading={saving} onClick={save}>
        Save Settings
      </Button>
    </div>
  );
}
