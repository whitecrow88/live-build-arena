-- Migration 002: Intake fields for guided build requests
-- Run in Supabase SQL editor

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS intake_token uuid DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS intake_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS project_category text,
  ADD COLUMN IF NOT EXISTS intake_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reference_images text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_requests_intake_token ON public.requests(intake_token);

-- Supabase Storage bucket for intake reference images
INSERT INTO storage.buckets (id, name, public)
VALUES ('intake-references', 'intake-references', true)
ON CONFLICT DO NOTHING;

-- Allow anyone to upload to the intake-references bucket (files are keyed by intake_token UUID)
CREATE POLICY IF NOT EXISTS "intake_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'intake-references');

CREATE POLICY IF NOT EXISTS "intake_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'intake-references');
