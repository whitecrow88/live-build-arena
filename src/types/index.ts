// ============================================================
// Live Build Arena — Core Types
// ============================================================

export type UserRole = "admin" | "streamer" | "buyer";
export type SessionStatus = "live" | "ended";
export type RequestSource = "kick" | "twitch" | "manual";
export type BuildStatus = "pending" | "running" | "success" | "failed";

export type RequestStatus =
  | "queued"
  | "approved"
  | "rejected"
  | "building"
  | "delivered"
  | "failed"
  | "refunded"
  | "disputed"
  | "partial_refund"
  | "revised"
  | "dispute_open"
  | "needs_clarification";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  display_name?: string;
  created_at: string;
  updated_at: string;
}

export interface StreamSession {
  id: string;
  title: string;
  status: SessionStatus;
  started_at: string;
  ended_at?: string;
  intake_paused: boolean;
  created_by?: string;
  created_at: string;
}

export interface Request {
  id: string;
  public_token: string;
  source: RequestSource;
  provider_event_id?: string;
  donor_name: string;
  donor_message: string;
  amount: number;
  currency: string;
  status: RequestStatus;
  stream_session_id?: string;
  buyer_contact?: string;
  requested_scope?: string;
  rejection_reason?: string;
  moderation_flags: ModerationFlag[];
  pinned: boolean;
  raw_payload?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // joined
  build_jobs?: BuildJob[];
}

export type ModerationFlag =
  | "adult_content"
  | "illegal_activity"
  | "malware"
  | "phishing"
  | "copyright_infringement"
  | "abusive_language"
  | "scope_too_large"
  | "vague_request"
  | "needs_clarification"
  | "policy_violation"
  | "scam";

export interface BuildJob {
  id: string;
  request_id: string;
  prompt_final?: string;
  build_status: BuildStatus;
  started_at?: string;
  finished_at?: string;
  time_cap_minutes: number;
  repo_url?: string;
  preview_url?: string;
  logs: BuildLog[];
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface BuildLog {
  step: BuildStep;
  message: string;
  timestamp: string;
}

export type BuildStep =
  | "analysing"
  | "generating"
  | "creating_repo"
  | "deploying"
  | "delivered"
  | "error";

export interface Revision {
  id: string;
  request_id: string;
  revision_count: number;
  notes?: string;
  requested_at: string;
  completed_at?: string;
}

export interface Policy {
  id: number;
  max_build_minutes: number;
  refund_policy_text: string;
  allowed_categories: string[];
  blocked_categories: string[];
  one_revision_enabled: boolean;
  auto_start_on_approve: boolean;
  updated_at: string;
}

export interface AuditLogEntry {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WebhookEvent {
  id: number;
  provider: string;
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  request_id?: string;
  received_at: string;
}

// ── Kick webhook payload ──────────────────────────────────────────
export interface KickDonationPayload {
  event_id: string;
  event_type: "donation" | "subscription" | "gifted_subscription";
  channel_id: string;
  donor_name: string;
  donor_message: string;
  amount: number;
  currency: string;
  timestamp: string;
}

// ── API response shapes ───────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface QueueOverlayItem {
  id: string;
  donor_name: string;
  requested_scope: string;
  amount: number;
  currency: string;
  status: RequestStatus;
  pinned: boolean;
  position: number;
}

export interface CurrentBuildOverlay {
  build_job: BuildJob | null;
  request: Pick<Request, "id" | "donor_name" | "requested_scope" | "amount" | "currency"> | null;
  elapsed_seconds: number;
  time_cap_seconds: number;
}

export interface DeliveryPage {
  donor_name: string;
  requested_scope: string;
  repo_url: string;
  preview_url: string;
  delivered_at: string;
  revision_available: boolean;
  amount: number;
  currency: string;
}
