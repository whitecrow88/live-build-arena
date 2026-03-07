# Live Build Arena

> Streamers receive paid build requests from Kick donations. Each request becomes a queued build job. The streamer approves it, an AI builder runs under a timer, then delivers a GitHub repo + live Vercel preview to the buyer.

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [GitHub](https://github.com) PAT with `repo:write` scope
- A [Vercel](https://vercel.com) account + API token
- (Optional) [Codex CLI](https://github.com/openai/codex) installed globally

### 2. Clone and install

```bash
git clone https://github.com/your-org/live-build-arena
cd live-build-arena
npm install
```

### 3. Environment variables

```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

See `.env.example` for the full list with descriptions.

### 4. Database setup

In your Supabase project, open the **SQL Editor** and run:

```sql
-- 1. Schema
-- paste contents of supabase/schema.sql

-- 2. Seed data (optional — 10 fake Kick requests)
-- paste contents of supabase/seed.sql
```

Or via Supabase CLI:
```bash
npx supabase db push --db-url $DATABASE_URL
```

### 5. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/admin/dashboard`.

**Admin password:** whatever you set as `ADMIN_SECRET` in `.env.local`.

---

## Architecture

```
Kick Donation
    │
    ▼
POST /api/webhooks/kick
    │  Verify HMAC signature
    │  Deduplicate by event_id
    │  Store raw in webhook_events
    │  Auto-moderate flags
    ▼
requests table (status: queued)
    │
    ▼
Admin Dashboard (/admin/requests)
    │  Approve / Reject / Clarify
    ▼
POST /api/requests/:id/start-build
    │  Creates build_job
    │  Runs build pipeline async
    ├─ AI Builder (Codex CLI or mock)
    ├─ GitHub: create repo + push files
    ├─ Vercel: deploy preview
    └─ Logs at each step
    ▼
build_job.status = success
requests.status = delivered
    │
    ▼
/delivery/:public_token  ← sent to buyer
```

---

## Pages

| URL | Description |
|-----|-------------|
| `/admin/dashboard` | At-a-glance stats, active build widget |
| `/admin/requests` | Full request queue — approve, reject, start build |
| `/admin/requests/[id]` | Request detail + build logs + audit trail |
| `/admin/settings` | Build policy (time cap, revisions, refund text) |
| `/admin/stream-session/current` | Start/end session, pause intake, revenue stats |
| `/overlay/queue` | OBS overlay — top 5 queue items |
| `/overlay/current-build` | OBS overlay — active build timer + steps |
| `/delivery/[token]` | Public delivery page for buyers |

---

## OBS Setup

### Queue Overlay
- Add → Browser Source
- URL: `http://localhost:3000/overlay/queue`
- Width: `400` | Height: `600`
- Enable **"Allow transparency"** (check "Shutdown source when not visible" is OFF)
- CSS override (optional, removes scrollbar): `body { overflow: hidden; }`

### Build Timer Overlay
- Add → Browser Source
- URL: `http://localhost:3000/overlay/current-build`
- Width: `700` | Height: `220`
- Enable **"Allow transparency"**

Both overlays auto-refresh every 3–5 seconds.

---

## AI Builder — Codex CLI vs API

### Option A: Codex CLI (recommended — no per-token cost)

The Codex CLI uses your OpenAI subscription, not the API billing meter.

```bash
# Install
npm install -g @openai/codex

# Set path in .env.local
CODEX_CLI_PATH=/usr/local/bin/codex
USE_MOCK_BUILDER=false

# Auth (Codex CLI uses OPENAI_API_KEY env var)
export OPENAI_API_KEY=sk-proj-...
```

The build runner writes an `AGENTS.md` spec file to a temp directory, runs `codex --approval-mode full-auto`, then reads back the generated files.

**Trade-offs:**
- ✅ No per-token API cost (uses subscription)
- ✅ Multi-file generation with agentic loop
- ⚠️ Subprocess management (timeout, crash handling)
- ⚠️ Non-streaming output (no live log updates)
- ⚠️ Requires local install — won't work on serverless without container

### Option B: OpenAI API (fallback)

Set `OPENAI_API_KEY` and `USE_MOCK_BUILDER=false`. The builder falls back to the mock scaffold when no Codex CLI path is set.

For production with real AI generation via API, extend `src/lib/services/ai-builder.ts` with an OpenAI streaming completion call.

### Option C: Mock (dev/testing)

```bash
USE_MOCK_BUILDER=true
```

Generates a Next.js scaffold template. No API calls. Used by default in dev.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/webhooks/kick` | Receive Kick donation events |
| `GET` | `/api/overlay/queue` | Top 5 queued requests (public) |
| `GET` | `/api/overlay/current-build` | Active build status (public) |
| `POST` | `/api/requests/:id/approve` | Approve a request |
| `POST` | `/api/requests/:id/reject` | Reject with reason |
| `POST` | `/api/requests/:id/start-build` | Start the build pipeline |
| `POST` | `/api/build-jobs/:id/deliver` | Mark as delivered |
| `GET` | `/api/requests/export` | Download CSV of all requests |
| `POST` | `/api/admin/auth` | Admin login (sets cookie) |

---

## Testing

```bash
npm test
```

Tests cover:
- Kick webhook signature verification
- Event normalisation
- Duplicate detection
- Auto-moderation flagging
- Build pipeline mock services
- Overlay response contracts

---

## Kick Webhook Setup

1. In your Kick developer portal, create a webhook subscription for your channel
2. Set the endpoint URL: `https://yourdomain.com/api/webhooks/kick`
3. Copy the webhook secret to `KICK_WEBHOOK_SECRET` in `.env.local`
4. Select event types: `donation`, `subscription`, `gifted_subscription`

**For local testing**, use [ngrok](https://ngrok.com) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/):
```bash
ngrok http 3000
# Use the ngrok URL as your Kick webhook endpoint
```

Or simulate a donation in dev:
```bash
curl -X POST http://localhost:3000/api/webhooks/kick \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test_001",
    "event_type": "donation",
    "channel_id": "your_channel",
    "sender": "TestDonor",
    "message": "Build me a Pomodoro timer with dark theme",
    "amount": 25,
    "currency": "USD"
  }'
```

---

## Production Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set env vars in Vercel dashboard or:
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

### Important for production

- Set `USE_MOCK_BUILDER=false` and configure real AI builder
- Move admin auth to Supabase Auth (the current cookie-based auth is MVP only)
- Use a proper job queue (e.g., [Inngest](https://www.inngest.com), [Trigger.dev](https://trigger.dev)) instead of `setImmediate`
- The build pipeline needs to run in a container/VM (not serverless) for Codex CLI subprocess support
- Configure Supabase RLS policies for your specific auth setup

---

## Product Rules

- Donations buy **priority in queue**, not guaranteed unlimited scope
- Each approved build has a **configurable time cap** (default: 15 minutes)
- Deliverable is an **MVP prototype** — not production-ready
- **One revision** maximum included per build
- Auto-reject: illegal, adult content, malware, phishing, copyright violations
- Full **audit log** preserved for all state changes

---

## Roadmap (Post-MVP)

- [ ] Stripe integration for direct payments (bypass donation platforms)
- [ ] Real-time WebSocket updates (Supabase Realtime)
- [ ] Proper Supabase Auth for admin
- [ ] Inngest / Trigger.dev for reliable background job queue
- [ ] Twitch bits/subscriptions ingestion
- [ ] Multi-streamer marketplace
- [ ] Buyer account portal
- [ ] Revision request flow with timer
- [ ] AI scope validator (pre-approve check)
- [ ] Revenue analytics dashboard

---

Built for live streamers. Ship code on stream. 🔴
