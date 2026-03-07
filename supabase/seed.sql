-- ============================================================
-- Live Build Arena — Seed Data (10 fake Kick requests)
-- ============================================================

-- Insert a demo stream session
insert into public.stream_sessions (id, title, status, started_at)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Live Build Session #1 — Let''s Ship!',
  'live',
  now() - interval '45 minutes'
);

-- 10 fake Kick requests with varied amounts and messages
insert into public.requests (
  provider_event_id, source, donor_name, donor_message, amount, currency,
  status, stream_session_id, requested_scope, moderation_flags, raw_payload, created_at
) values

(
  'kick_evt_001', 'kick', 'TechWizard99',
  'Build me a Pomodoro timer app with a dark theme, sound alerts and local storage for session history',
  50.00, 'USD', 'queued',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Pomodoro timer web app — dark theme, sound, localStorage history',
  '[]',
  '{"event_type":"donation","amount":50,"currency":"USD"}',
  now() - interval '40 minutes'
),

(
  'kick_evt_002', 'kick', 'CryptoKing420',
  'Can you make a crypto price tracker that shows BTC ETH and SOL with a nice chart?',
  25.00, 'USD', 'queued',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Crypto price tracker with BTC/ETH/SOL charts',
  '[]',
  '{"event_type":"donation","amount":25,"currency":"USD"}',
  now() - interval '38 minutes'
),

(
  'kick_evt_003', 'kick', 'DevDreamer',
  'Build a markdown note-taking app with tags, search and auto-save. PWA if possible!',
  100.00, 'USD', 'approved',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Markdown notes PWA with tags, search, auto-save',
  '[]',
  '{"event_type":"donation","amount":100,"currency":"USD"}',
  now() - interval '35 minutes'
),

(
  'kick_evt_004', 'kick', 'StreamFan_Bob',
  'Make a random meal generator that picks a recipe based on ingredients I have',
  15.00, 'USD', 'queued',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Meal generator from available ingredients',
  '[]',
  '{"event_type":"donation","amount":15,"currency":"USD"}',
  now() - interval '32 minutes'
),

(
  'kick_evt_005', 'kick', 'xXNightOwlXx',
  'Build an adult website with explicit content please',
  200.00, 'USD', 'rejected',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Adult content site',
  '["adult_content", "policy_violation"]',
  '{"event_type":"donation","amount":200,"currency":"USD"}',
  now() - interval '30 minutes'
),

(
  'kick_evt_006', 'kick', 'HackerHero',
  'Create a URL shortener with analytics dashboard showing clicks, referrers, device types',
  75.00, 'USD', 'queued',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'URL shortener with analytics dashboard',
  '[]',
  '{"event_type":"donation","amount":75,"currency":"USD"}',
  now() - interval '28 minutes'
),

(
  'kick_evt_007', 'kick', 'GameDevGuru',
  'Make a snake game but multiplayer! Two players on same keyboard.',
  40.00, 'USD', 'building',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Two-player Snake game (same keyboard)',
  '[]',
  '{"event_type":"donation","amount":40,"currency":"USD"}',
  now() - interval '25 minutes'
),

(
  'kick_evt_008', 'kick', 'StartupSam',
  'Build a landing page for my SaaS product called TaskFlow. Needs pricing section, hero, features, CTA.',
  60.00, 'USD', 'delivered',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'SaaS landing page for TaskFlow with pricing, hero, features',
  '[]',
  '{"event_type":"donation","amount":60,"currency":"USD"}',
  now() - interval '20 minutes'
),

(
  'kick_evt_009', 'kick', 'CodeNewbie_Lisa',
  'Can you explain and build me a REST API with authentication? Just a simple todo API.',
  20.00, 'USD', 'queued',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'REST API with JWT auth for a Todo list',
  '[]',
  '{"event_type":"donation","amount":20,"currency":"USD"}',
  now() - interval '15 minutes'
),

(
  'kick_evt_010', 'kick', 'BigSpender_Max',
  'Build me a full SaaS with user auth, billing, multi-tenant support, admin dashboard, and mobile app.',
  500.00, 'USD', 'queued',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Full SaaS platform (too large — needs scoping)',
  '["scope_too_large", "needs_clarification"]',
  '{"event_type":"donation","amount":500,"currency":"USD"}',
  now() - interval '10 minutes'
);

-- Insert a delivered build job for StreamFan #8 (TaskFlow landing page)
insert into public.build_jobs (
  request_id, prompt_final, build_status, started_at, finished_at,
  repo_url, preview_url, logs
)
select
  r.id,
  'Build a SaaS landing page for TaskFlow. Include: hero with CTA, features grid, pricing table (3 tiers), footer. Use Next.js, Tailwind CSS, dark theme.',
  'success',
  now() - interval '18 minutes',
  now() - interval '5 minutes',
  'https://github.com/live-build-arena/taskflow-landing-' || substr(r.public_token::text, 1, 8),
  'https://taskflow-landing-' || substr(r.public_token::text, 1, 8) || '.vercel.app',
  jsonb_build_array(
    jsonb_build_object('step','analysing','message','Analysing request scope...','timestamp',now() - interval '18 minutes'),
    jsonb_build_object('step','generating','message','Generating code with AI builder...','timestamp',now() - interval '16 minutes'),
    jsonb_build_object('step','creating_repo','message','Creating GitHub repo...','timestamp',now() - interval '8 minutes'),
    jsonb_build_object('step','deploying','message','Deploying to Vercel...','timestamp',now() - interval '7 minutes'),
    jsonb_build_object('step','delivered','message','Delivered successfully!','timestamp',now() - interval '5 minutes')
  )
from public.requests r where r.provider_event_id = 'kick_evt_008';

-- Insert an in-progress build job for GameDevGuru #7
insert into public.build_jobs (
  request_id, prompt_final, build_status, started_at, logs
)
select
  r.id,
  'Build a two-player Snake game playable on the same keyboard. Player 1: WASD, Player 2: Arrow keys. Canvas-based, score display, game over screen. Vanilla JS or React.',
  'running',
  now() - interval '3 minutes',
  jsonb_build_array(
    jsonb_build_object('step','analysing','message','Analysing request scope...','timestamp',now() - interval '3 minutes'),
    jsonb_build_object('step','generating','message','Generating code with AI builder...','timestamp',now() - interval '2 minutes')
  )
from public.requests r where r.provider_event_id = 'kick_evt_007';

-- Audit log entries
insert into public.audit_log (entity_type, entity_id, action, metadata)
select 'request', id, 'created', '{"source":"kick"}'::jsonb
from public.requests;

insert into public.audit_log (entity_type, entity_id, action, metadata)
select 'request', id, 'approved', '{"auto":false}'::jsonb
from public.requests where status in ('approved', 'building', 'delivered');

insert into public.audit_log (entity_type, entity_id, action, metadata)
select 'request', id, 'rejected', '{"reason":"policy_violation","flags":["adult_content"]}'::jsonb
from public.requests where status = 'rejected';
