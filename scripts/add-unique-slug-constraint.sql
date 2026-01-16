-- Add unique constraint to slug column in campaigns table
-- This ensures no two campaigns can have the same slug

ALTER TABLE campaigns ADD CONSTRAINT unique_slug UNIQUE (slug);

-- Note: This will fail if there are duplicate slugs in the database
-- Run fixDuplicateSlugs.ts script first to ensure all slugs are unique
