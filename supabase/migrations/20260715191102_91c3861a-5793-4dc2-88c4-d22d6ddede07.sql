
-- Enums
CREATE TYPE public.maintenance_status AS ENUM ('reported','in_progress','resolved','cancelled');
CREATE TYPE public.maintenance_urgency AS ENUM ('low','medium','high','emergency');

-- Extend notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'maintenance_reported';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'maintenance_updated';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'maintenance_resolved';

-- Table
CREATE TABLE public.maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.property_listings(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency public.maintenance_urgency NOT NULL DEFAULT 'medium',
  status public.maintenance_status NOT NULL DEFAULT 'reported',
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  landlord_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX maintenance_tickets_property_idx ON public.maintenance_tickets(property_id);
CREATE INDEX maintenance_tickets_tenant_idx ON public.maintenance_tickets(tenant_id);
CREATE INDEX maintenance_tickets_status_idx ON public.maintenance_tickets(status);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.maintenance_tickets TO authenticated;
GRANT ALL ON public.maintenance_tickets TO service_role;

-- RLS
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants view their own tickets"
  ON public.maintenance_tickets FOR SELECT TO authenticated
  USING (auth.uid() = tenant_id);

CREATE POLICY "Landlords view tickets on their listings"
  ON public.maintenance_tickets FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_listings p
    WHERE p.id = property_id AND p.landlord_id = auth.uid()
  ));

CREATE POLICY "Tenants create their own tickets"
  ON public.maintenance_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tenant_id);

-- Tenants may cancel their own tickets (not overwrite landlord fields)
CREATE POLICY "Tenants update their own tickets"
  ON public.maintenance_tickets FOR UPDATE TO authenticated
  USING (auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Landlords update tickets on their listings"
  ON public.maintenance_tickets FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_listings p
    WHERE p.id = property_id AND p.landlord_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.property_listings p
    WHERE p.id = property_id AND p.landlord_id = auth.uid()
  ));

-- updated_at trigger (reuse existing set_updated_at if present)
CREATE TRIGGER maintenance_tickets_set_updated_at
  BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_tickets;
