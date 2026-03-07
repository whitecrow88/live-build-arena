"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/admin/dashboard";
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    });

    if (res.ok) {
      router.push(redirect);
    } else {
      setError("Invalid admin secret");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-white mb-1">Admin Secret</label>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="w-full bg-arena-surface border border-arena-border rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-arena-accent"
          placeholder="Enter admin secret..."
          autoFocus
        />
        {error && <p className="text-arena-red text-xs mt-1">{error}</p>}
      </div>

      <button
        type="submit"
        className="w-full bg-arena-accent text-arena-bg font-semibold rounded-lg py-3 hover:bg-emerald-400 transition-colors"
      >
        Enter Admin
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-arena-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-mono font-bold text-arena-accent">LIVE BUILD ARENA</h1>
          <p className="text-arena-muted text-sm mt-1">Admin Access</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
