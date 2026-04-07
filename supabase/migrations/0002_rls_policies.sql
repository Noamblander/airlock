-- Enable RLS on all tables

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
-- Users can only see their own tenant's data

CREATE POLICY tenant_isolation ON tenants
  FOR ALL USING (
    id = ((current_setting('request.jwt.claims', true)::json)->>'tenant_id')::uuid
  );

CREATE POLICY tenant_isolation ON users
  FOR ALL USING (
    tenant_id = ((current_setting('request.jwt.claims', true)::json)->>'tenant_id')::uuid
  );

CREATE POLICY tenant_isolation ON folders
  FOR ALL USING (
    tenant_id = ((current_setting('request.jwt.claims', true)::json)->>'tenant_id')::uuid
  );

CREATE POLICY tenant_isolation ON projects
  FOR ALL USING (
    tenant_id = ((current_setting('request.jwt.claims', true)::json)->>'tenant_id')::uuid
  );

CREATE POLICY tenant_isolation ON deployments
  FOR ALL USING (
    tenant_id = ((current_setting('request.jwt.claims', true)::json)->>'tenant_id')::uuid
  );

CREATE POLICY tenant_isolation ON secrets
  FOR ALL USING (
    tenant_id = ((current_setting('request.jwt.claims', true)::json)->>'tenant_id')::uuid
  );

CREATE POLICY tenant_isolation ON project_secrets
  FOR ALL USING (
    tenant_id = ((current_setting('request.jwt.claims', true)::json)->>'tenant_id')::uuid
  );

CREATE POLICY tenant_isolation ON agents
  FOR ALL USING (
    tenant_id = ((current_setting('request.jwt.claims', true)::json)->>'tenant_id')::uuid
  );

CREATE POLICY tenant_isolation ON usage_events
  FOR ALL USING (
    tenant_id = ((current_setting('request.jwt.claims', true)::json)->>'tenant_id')::uuid
  );

-- Service role bypass (for server-side operations)
-- Supabase service role key bypasses RLS by default
