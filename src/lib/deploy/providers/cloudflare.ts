import type { Framework } from "../types";
import type {
  DeployProvider,
  ProviderConfig,
  ProviderFile,
  ProviderProject,
  ProviderDeployment,
  EnvVar,
} from "./types";

const CF_API = "https://api.cloudflare.com/client/v4";

function accountId(config: ProviderConfig): string {
  return config.teamId || (config.extra?.accountId as string) || "";
}

async function cfFetch(
  path: string,
  config: ProviderConfig,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${CF_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.token}`,
      ...options.headers,
    },
  });
}

export class CloudflareProvider implements DeployProvider {
  readonly name = "cloudflare" as const;

  async createProject(
    name: string,
    framework: Framework,
    config: ProviderConfig
  ): Promise<ProviderProject> {
    const acctId = accountId(config);

    // Check if project exists
    const getRes = await cfFetch(
      `/accounts/${acctId}/pages/projects/${name}`,
      config
    );
    if (getRes.ok) {
      const data = await getRes.json();
      return { id: data.result.name, name: data.result.name };
    }

    const buildConfigMap: Record<Framework, Record<string, string>> = {
      nextjs: {
        build_command: "npx next build",
        destination_dir: ".next",
      },
      vite: { build_command: "npx vite build", destination_dir: "dist" },
      static: { build_command: "", destination_dir: "." },
    };

    const res = await cfFetch(`/accounts/${acctId}/pages/projects`, config, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        production_branch: "main",
        build_config: buildConfigMap[framework],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(
        `Failed to create Cloudflare Pages project: ${
          err.errors?.[0]?.message || JSON.stringify(err)
        }`
      );
    }

    const data = await res.json();
    return { id: data.result.name, name: data.result.name };
  }

  async deploy(
    projectId: string,
    files: ProviderFile[],
    _framework: Framework,
    config: ProviderConfig
  ): Promise<ProviderDeployment> {
    const acctId = accountId(config);

    // Cloudflare Pages uses multipart form upload for direct uploads
    const formData = new FormData();
    for (const file of files) {
      formData.append(
        file.path,
        new Blob([file.content], { type: "application/octet-stream" }),
        file.path
      );
    }

    const res = await fetch(
      `${CF_API}/accounts/${acctId}/pages/projects/${projectId}/deployments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
        body: formData,
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(
        `Failed to deploy to Cloudflare Pages: ${
          err.errors?.[0]?.message || JSON.stringify(err)
        }`
      );
    }

    const data = await res.json();
    return {
      id: data.result.id,
      url: data.result.url || `${projectId}.pages.dev`,
    };
  }

  async setEnvVars(
    projectId: string,
    vars: EnvVar[],
    config: ProviderConfig
  ): Promise<void> {
    if (vars.length === 0) return;
    const acctId = accountId(config);

    const envVarMap: Record<string, { value: string; type: string }> = {};
    for (const v of vars) {
      envVarMap[v.key] = { value: v.value, type: "secret_text" };
    }

    const res = await cfFetch(
      `/accounts/${acctId}/pages/projects/${projectId}`,
      config,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deployment_configs: {
            production: { env_vars: envVarMap },
            preview: { env_vars: envVarMap },
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(
        `Failed to set env vars on Cloudflare Pages: ${
          err.errors?.[0]?.message || JSON.stringify(err)
        }`
      );
    }
  }

  async deleteDeployment(
    deploymentId: string,
    config: ProviderConfig
  ): Promise<void> {
    const acctId = accountId(config);

    // deploymentId here is the project name for deletion
    const res = await cfFetch(
      `/accounts/${acctId}/pages/projects/${deploymentId}`,
      config,
      { method: "DELETE" }
    );

    if (!res.ok && res.status !== 404) {
      const err = await res.json();
      throw new Error(
        `Failed to delete Cloudflare Pages project: ${
          err.errors?.[0]?.message || JSON.stringify(err)
        }`
      );
    }
  }

  getDeployUrl(deployment: ProviderDeployment): string {
    const url = deployment.url;
    return url.startsWith("https://") ? url : `https://${url}`;
  }
}
