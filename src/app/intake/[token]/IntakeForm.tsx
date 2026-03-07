"use client";

import { useState, useRef } from "react";
import { AGENT_CATEGORIES, type AgentCategory } from "@/lib/services/agent-prompts";

interface Props {
  intakeToken: string;
  donorName: string;
  donorMessage: string;
}

export default function IntakeForm({ intakeToken, donorName, donorMessage }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [category, setCategory] = useState<AgentCategory | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const progress = ((step - 1) / 3) * 100;

  function setAnswer(id: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function toggleMulti(id: string, option: string) {
    const current = (answers[id] as string[]) ?? [];
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    setAnswer(id, next);
  }

  async function handleImageUpload(files: FileList) {
    if (!files.length) return;
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/intake/${intakeToken}/upload`, { method: "POST", body: form });
      if (res.ok) {
        const { url } = await res.json() as { url: string };
        uploaded.push(url);
      }
    }
    setReferenceImages((prev) => [...prev, ...uploaded]);
    setUploading(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/intake/${intakeToken}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: category?.id,
        answers,
        additional_notes: additionalNotes,
        reference_images: referenceImages,
      }),
    });
    if (res.ok) {
      setDone(true);
    } else {
      const body = await res.json() as { error?: string };
      setError(body.error ?? "Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-arena-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-arena-accent/10 border-2 border-arena-accent flex items-center justify-center text-4xl mx-auto">
            🚀
          </div>
          <h1 className="text-3xl font-bold text-white">Build locked in!</h1>
          <p className="text-arena-muted leading-relaxed">
            Your requirements have been received. We&apos;re spinning up your specialist agent now.
            We&apos;ll post your delivery link in chat when it&apos;s ready — usually within 15 minutes.
          </p>
          <div className="rounded-xl border border-arena-border bg-arena-surface p-4 text-left">
            <p className="text-xs text-arena-muted font-mono uppercase tracking-wider mb-2">Your request</p>
            <p className="text-white text-sm">{donorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arena-bg font-sans">
      {/* Header */}
      <div className="border-b border-arena-border px-6 py-4 flex items-center justify-between">
        <span className="font-mono font-bold text-arena-accent">StreamCoder.live</span>
        <span className="text-sm text-arena-muted">Build request for <span className="text-white">{donorName}</span></span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-arena-border">
        <div
          className="h-full bg-arena-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Step 1: Category */}
        {step === 1 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <p className="text-xs font-mono text-arena-accent uppercase tracking-wider mb-2">Step 1 of 3</p>
              <h1 className="text-2xl font-bold text-white">What do you want built?</h1>
              <p className="text-arena-muted text-sm mt-1">Pick the type that best matches your idea.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AGENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    category?.id === cat.id
                      ? "border-arena-accent bg-arena-accent/10"
                      : "border-arena-border bg-arena-surface hover:border-arena-accent/50"
                  }`}
                >
                  <div className="text-2xl mb-2">{cat.icon}</div>
                  <p className="font-semibold text-white text-sm">{cat.name}</p>
                  <p className="text-arena-muted text-xs mt-0.5">{cat.description}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!category}
              className="w-full py-4 rounded-xl bg-arena-accent text-black font-bold text-base hover:bg-arena-accent/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next: Tell us more →
            </button>
          </div>
        )}

        {/* Step 2: Category questions */}
        {step === 2 && category && (
          <div className="animate-fade-in space-y-6">
            <div>
              <p className="text-xs font-mono text-arena-accent uppercase tracking-wider mb-2">Step 2 of 3 · {category.icon} {category.name}</p>
              <h1 className="text-2xl font-bold text-white">Tell us about your project</h1>
              <p className="text-arena-muted text-sm mt-1">The more detail you give, the better the build.</p>
            </div>

            <div className="space-y-5">
              {category.questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-sm font-semibold text-white mb-2">
                    {q.label}
                    {q.required && <span className="text-arena-accent ml-1">*</span>}
                  </label>

                  {q.type === "text" && (
                    <input
                      type="text"
                      value={(answers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      placeholder={q.placeholder}
                      className="w-full rounded-lg border border-arena-border bg-arena-bg px-4 py-3 text-white placeholder-arena-muted text-sm focus:outline-none focus:border-arena-accent"
                    />
                  )}

                  {q.type === "textarea" && (
                    <textarea
                      value={(answers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      placeholder={q.placeholder}
                      rows={3}
                      className="w-full rounded-lg border border-arena-border bg-arena-bg px-4 py-3 text-white placeholder-arena-muted text-sm focus:outline-none focus:border-arena-accent resize-none"
                    />
                  )}

                  {q.type === "select" && q.options && (
                    <select
                      value={(answers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      className="w-full rounded-lg border border-arena-border bg-arena-bg px-4 py-3 text-white text-sm focus:outline-none focus:border-arena-accent"
                    >
                      <option value="">Select one...</option>
                      {q.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {q.type === "multiselect" && q.options && (
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((opt) => {
                        const selected = ((answers[q.id] as string[]) ?? []).includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleMulti(q.id, opt)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              selected
                                ? "border-arena-accent bg-arena-accent/15 text-arena-accent"
                                : "border-arena-border bg-arena-surface text-arena-muted hover:border-arena-accent/50"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {q.type === "boolean" && (
                    <div className="flex gap-3">
                      {["Yes", "No"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswer(q.id, opt)}
                          className={`px-6 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                            answers[q.id] === opt
                              ? "border-arena-accent bg-arena-accent/15 text-arena-accent"
                              : "border-arena-border bg-arena-surface text-arena-muted hover:border-arena-accent/50"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-xl border border-arena-border text-arena-muted hover:text-white hover:border-arena-accent transition-colors text-sm"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl bg-arena-accent text-black font-bold text-base hover:bg-arena-accent/90 active:scale-95 transition-all"
              >
                Next: References →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: References + notes */}
        {step === 3 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <p className="text-xs font-mono text-arena-accent uppercase tracking-wider mb-2">Step 3 of 3</p>
              <h1 className="text-2xl font-bold text-white">References & final notes</h1>
              <p className="text-arena-muted text-sm mt-1">Upload any mockups, screenshots, or inspiration. Optional but helpful.</p>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Reference images</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-arena-border rounded-xl p-8 text-center cursor-pointer hover:border-arena-accent/50 transition-colors"
              >
                <p className="text-3xl mb-2">🖼️</p>
                <p className="text-white text-sm font-medium">Click to upload images</p>
                <p className="text-arena-muted text-xs mt-1">Mockups, screenshots, colour palettes, inspiration — any image format</p>
                {uploading && <p className="text-arena-accent text-xs mt-2 animate-pulse">Uploading...</p>}
              </div>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
              />
              {referenceImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {referenceImages.map((url, i) => (
                    <div key={i} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Reference ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-arena-border" />
                      <button
                        onClick={() => setReferenceImages((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional notes */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Additional notes <span className="text-arena-muted font-normal">(optional)</span></label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Anything else the builder should know? Specific behaviours, things to avoid, must-haves..."
                rows={4}
                className="w-full rounded-lg border border-arena-border bg-arena-bg px-4 py-3 text-white placeholder-arena-muted text-sm focus:outline-none focus:border-arena-accent resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-xl border border-arena-border text-arena-muted hover:text-white hover:border-arena-accent transition-colors text-sm"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-3 rounded-xl bg-arena-accent text-black font-bold text-base hover:bg-arena-accent/90 active:scale-95 transition-all"
              >
                Review & Submit →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && category && (
          <div className="animate-fade-in space-y-6">
            <div>
              <p className="text-xs font-mono text-arena-accent uppercase tracking-wider mb-2">Review</p>
              <h1 className="text-2xl font-bold text-white">Does everything look right?</h1>
              <p className="text-arena-muted text-sm mt-1">Check your details before we start building.</p>
            </div>

            <div className="rounded-xl border border-arena-border bg-arena-surface divide-y divide-arena-border">
              <div className="p-4">
                <p className="text-xs text-arena-muted font-mono uppercase tracking-wider mb-1">Project type</p>
                <p className="text-white font-semibold">{category.icon} {category.name}</p>
              </div>
              {Object.entries(answers).map(([key, val]) => {
                const q = category.questions.find((q) => q.id === key);
                if (!q || !val || (Array.isArray(val) && val.length === 0)) return null;
                return (
                  <div key={key} className="p-4">
                    <p className="text-xs text-arena-muted font-mono uppercase tracking-wider mb-1">{q.label}</p>
                    <p className="text-white text-sm">{Array.isArray(val) ? val.join(", ") : val}</p>
                  </div>
                );
              })}
              {referenceImages.length > 0 && (
                <div className="p-4">
                  <p className="text-xs text-arena-muted font-mono uppercase tracking-wider mb-2">Reference images</p>
                  <div className="flex gap-2 flex-wrap">
                    {referenceImages.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt={`Ref ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-arena-border" />
                    ))}
                  </div>
                </div>
              )}
              {additionalNotes && (
                <div className="p-4">
                  <p className="text-xs text-arena-muted font-mono uppercase tracking-wider mb-1">Additional notes</p>
                  <p className="text-white text-sm">{additionalNotes}</p>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-700 bg-red-950/30 p-4 text-red-400 text-sm">{error}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 rounded-xl border border-arena-border text-arena-muted hover:text-white hover:border-arena-accent transition-colors text-sm"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-4 rounded-xl bg-arena-accent text-black font-bold text-base hover:bg-arena-accent/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Lock In My Build 🚀"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
