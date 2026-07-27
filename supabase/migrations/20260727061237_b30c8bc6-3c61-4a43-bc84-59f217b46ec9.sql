ALTER TABLE public.tenant_passports
ADD COLUMN IF NOT EXISTS income_breakdown JSONB NOT NULL DEFAULT '{
  "employment_gross_annual": 0,
  "universal_credit_annual": 0,
  "housing_element_annual": 0,
  "other_benefits_annual": 0,
  "disability_benefits_annual": 0
}'::jsonb;