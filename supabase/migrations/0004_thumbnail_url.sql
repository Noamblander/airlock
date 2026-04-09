-- Add thumbnail_url column to projects table for storing app preview screenshots
ALTER TABLE projects ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
