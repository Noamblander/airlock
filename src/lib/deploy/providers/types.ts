import type { Framework } from "../types";

export type CloudProvider = "vercel" | "aws" | "cloudflare" | "netlify";

export type DbProvider = "postgres" | "mysql" | "mongodb";

export interface ProviderConfig {
  token: string;
  teamId: string | null;
  region?: string;
  extra?: Record<string, unknown>;
}

export interface ProviderFile {
  path: string;
  content: string;
}

export interface ProviderProject {
  id: string;
  name: string;
}

export interface ProviderDeployment {
  id: string;
  url: string;
  readyState?: string;
}

export interface EnvVar {
  key: string;
  value: string;
  target: string[];
}

export interface DeployProvider {
  readonly name: CloudProvider;

  createProject(
    name: string,
    framework: Framework,
    config: ProviderConfig
  ): Promise<ProviderProject>;

  deploy(
    projectId: string,
    files: ProviderFile[],
    framework: Framework,
    config: ProviderConfig
  ): Promise<ProviderDeployment>;

  setEnvVars(
    projectId: string,
    vars: EnvVar[],
    config: ProviderConfig
  ): Promise<void>;

  deleteDeployment(
    deploymentId: string,
    config: ProviderConfig
  ): Promise<void>;

  deleteProject(
    projectId: string,
    config: ProviderConfig
  ): Promise<void>;

  getDeployUrl(deployment: ProviderDeployment): string;
}
