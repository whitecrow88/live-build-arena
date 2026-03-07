"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatAmount, truncate } from "@/lib/utils";
import type { QueueOverlayItem } from "@/types";

const MAX_ITEMS = 5;

function useQueueRealtime() {
  const [items, setItems] = useState<QueueOverlayItem[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevIds = useRef<Set<string>>(new Set());

  async function fetchQueue() {
    const res = await fetch("/api/overlay/queue", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const incoming: QueueOverlayItem[] = data.items ?? [];

    // Detect new items for flash animation
    const arrived = incoming
      .filter((i) => !prevIds.current.has(i.id))
      .map((i) => i.id);

    if (arrived.length > 0) {
      setNewIds(new Set(arrived));
      // Play notification sound
      playNotification();
      // Remove flash after 1.5s
      setTimeout(() => setNewIds(new Set()), 1500);
    }

    prevIds.current = new Set(incoming.map((i) => i.id));
    setItems(incoming);
  }

  function playNotification() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      // Two-tone chime
      [523.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        const start = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch {
      // Audio context blocked — fine, sound is bonus
    }
  }

  useEffect(() => {
    fetchQueue();

    const db = createClient();

    // Supabase Realtime — instant updates
    const channel = db
      .channel("overlay-queue")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "requests",
          filter: "status=in.(queued,approved,building)",
        },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, []);

  return { items, newIds };
}

export function QueueOverlayRealtime() {
  const { items, newIds } = useQueueRealtime();

  return (
    <div className="space-y-2 w-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-arena-accent animate-pulse" />
        <span className="text-arena-accent font-mono text-xs font-bold uppercase tracking-[0.2em]">
          Build Queue
        </span>
        {items.length > 0 && (
          <span className="ml-auto text-arena-muted font-mono text-xs">
            {items.length} pending
          </span>
        )}
      </div>

      {items.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-sm px-4 py-5">
          <p className="text-white/40 text-sm font-mono text-center">
            Queue is empty — cheer or sub to request a build!
          </p>
        </div>
      )}

      {items.map((item, i) => (
        <QueueCard
          key={item.id}
          item={item}
          index={i}
          isNew={newIds.has(item.id)}
        />
      ))}
    </div>
  );
}

function QueueCard({
  item,
  index,
  isNew,
}: {
  item: QueueOverlayItem;
  index: number;
  isNew: boolean;
}) {
  const isBuilding = item.status === "building";
  const isPinned = item.pinned;

  return (
    <div
      className={[
        "relative rounded-2xl border backdrop-blur-sm px-4 py-3 transition-all duration-300",
        "animate-slide-in-right",
        isNew ? "animate-new-item" : "bg-black/70",
        isPinned
          ? "border-arena-amber/60 animate-glow-amber"
          : isBuilding
          ? "border-arena-accent/50 animate-glow-green"
          : "border-white/10",
      ].join(" ")}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Position + amount row */}
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2">
          {/* Position badge */}
          <span
            className={[
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0",
              index === 0 && !isPinned
                ? "bg-arena-accent text-arena-bg"
                : isPinned
                ? "bg-arena-amber text-arena-bg"
                : "bg-white/10 text-white/60",
            ].join(" ")}
          >
            {isPinned ? "📌" : index + 1}
          </span>

          {/* Donor name */}
          <span className="font-bold text-white text-sm leading-tight truncate overlay-safe">
            {item.donor_name}
          </span>
        </div>

        {/* Amount — big and amber */}
        <span className="font-mono font-bold text-arena-amber text-lg shrink-0 overlay-safe">
          {formatAmount(item.amount, item.currency)}
        </span>
      </div>

      {/* Request text */}
      <p className="text-white/65 text-xs leading-snug pl-8">
        {truncate(item.requested_scope ?? "", 72)}
      </p>

      {/* Building indicator */}
      {isBuilding && (
        <div className="mt-2 pl-8 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-arena-accent animate-pulse" />
          <span className="text-arena-accent text-xs font-mono font-medium">
            Building now...
          </span>
        </div>
      )}

      {/* New request flash label */}
      {isNew && (
        <div className="absolute -top-2 -right-2 bg-arena-accent text-arena-bg text-xs font-mono font-bold px-2 py-0.5 rounded-full animate-slide-in-up">
          NEW
        </div>
      )}
    </div>
  );
}
