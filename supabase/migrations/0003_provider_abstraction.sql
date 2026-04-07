-- Migration: Provider abstraction
-- Renames Vercel-specific columns to generic provider columns
-- Adds cloud/DB provider selection fields

-- Add provider selection columns to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cloud_provider text NOT NULL DEFAULT 'vercel';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cloud_config jsonb DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS db_provider text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS db_config jsonb DEFAULT '{}';

-- Rename Vercel-specific columns to generic names
ALTER TABLE tenants RENAME COLUMN vercel_team_id TO cloud_team_id;
ALTER TABLE tenants RENAME COLUMN vercel_api_token TO cloud_api_token;
ALTER TABLE projects RENAME COLUMN vercel_project_id TO provider_project_id;
ALTER TABLE projects RENAME COLUMN vercel_url TO deploy_url;
ALTER TABLE deployments RENAME COLUMN vercel_deploy_id TO provider_deploy_id;

-- Add language column to users (was in Drizzle schema but missing from migration 0001)
ALTER TABLE users ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
