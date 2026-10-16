ALTER TYPE public.share_status ADD VALUE IF NOT EXISTS 'declined';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'application_info_requested';
ALTER TABLE public.passport_shares ADD COLUMN IF NOT EXISTS declined_at timestamptz;
ALTER TABLE public.passport_shares ADD COLUMN IF NOT EXISTS declined_reason text;
ALTER TABLE public.passport_shares ADD COLUMN IF NOT EXISTS info_requested_at timestamptz;
ALTER TABLE public.passport_shares ADD COLUMN IF NOT EXISTS info_requested_items text[] NOT NULL DEFAULT '{}';