-- Migration: Add lead_id to cases and converted flag to leads
-- Enables lead-to-case conversion workflow

-- Add lead_id column to app.cases to track which lead created the case
ALTER TABLE app.cases 
ADD COLUMN IF NOT EXISTS lead_id INTEGER REFERENCES public.leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cases_lead_id ON app.cases(lead_id);

-- Add converted flag to public.leads to mark leads that have been converted to cases
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS converted BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_leads_converted ON public.leads(converted);

-- Add org_id to public.leads for multi-tenant support
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES app.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_leads_org_id ON public.leads(org_id);

COMMENT ON COLUMN app.cases.lead_id IS 'Links case back to original lead/intake submission';
COMMENT ON COLUMN public.leads.converted IS 'TRUE when lead has been converted to a case';
COMMENT ON COLUMN public.leads.org_id IS 'Organization that owns this lead for multi-tenant support';
