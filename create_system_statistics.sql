-- Create system_statistics table
CREATE TABLE IF NOT EXISTS public.system_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    total_campaigns INT NOT NULL,
    active_campaigns INT NOT NULL,
    approved_campaigns INT NOT NULL,
    missing_brand_count INT DEFAULT 0,
    missing_sector_count INT DEFAULT 0,
    missing_category_count INT DEFAULT 0,
    ai_incomplete_count INT DEFAULT 0,
    bank_breakdown JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.system_statistics ENABLE ROW LEVEL SECURITY;

-- Allow public read (for dashboard)
CREATE POLICY "Allow public read on system_statistics" 
ON public.system_statistics FOR SELECT 
USING (true);

-- Allow authenticated insert (for scraper service)
CREATE POLICY "Allow authenticated insert on system_statistics" 
ON public.system_statistics FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon'); 
-- NOTE: In production, restricted to service role or specific token

-- Create index for performance
CREATE INDEX idx_system_statistics_created_at ON public.system_statistics (created_at DESC);
