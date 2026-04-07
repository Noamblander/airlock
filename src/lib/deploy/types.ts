export type Framework = "nextjs" | "vite" | "static";

export type DeployPayload = {
  project_name: string;
  files?: Record<string, string>;
  update_files?: Record<string, string>;
  framework: Framework;
  env_vars?: string[];
  description?: string;
  folder?: string;
};

export type DeployResult = {
  url: string;
  status: "live";
  projectId: string;
  deploymentId: string;
};

export type McpError = {
  error: true;
  code: string;
  message: string;
  file?: string;
  line?: number;
};

export type TenantConfig = {
  platformUrl: string;
  tenantSlug: string;
  jwtSecret: string;
};
