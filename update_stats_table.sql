-- Add new metric columns to system_statistics
ALTER TABLE public.system_statistics 
ADD COLUMN IF NOT EXISTS math_error_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS text_mismatch_count INT DEFAULT 0;
