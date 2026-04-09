import type { Framework } from "../types";
import type {
  DeployProvider,
  ProviderConfig,
  ProviderFile,
  ProviderProject,
  ProviderDeployment,
  EnvVar,
} from "./types";

const VERCEL_API = "https://api.vercel.com";

async function vercelFetch(
  path: string,
  token: string,
  teamId: string | null,
  options: RequestInit = {}
): Promise<Response> {
  const url = new URL(path, VERCEL_API);
  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }

  return fetch(url.toString(), {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export class VercelProvider implements DeployProvider {
  readonly name = "vercel" as const;

  async createProject(
    name: string,
    framework: Framework,
    config: ProviderConfig
  ): Promise<ProviderProject> {
    const getRes = await vercelFetch(
      `/v9/projects/${name}`,
      config.token,
      config.teamId
    );
    if (getRes.ok) {
      return getRes.json();
    }

    const frameworkMap: Record<Framework, string | null> = {
      nextjs: "nextjs",
      vite: "vite",
      static: null,
    };

    const body: Record<string, unknown> = { name };
    const fw = frameworkMap[framework];
    if (fw) {
      body.framework = fw;
    }

    const createRes = await vercelFetch("/v11/projects", config.token, config.teamId, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(
        `Failed to create Vercel project: ${err.error?.message || JSON.stringify(err)}`
      );
    }

    const project = await createRes.json();

    await vercelFetch(`/v9/projects/${project.id}`, config.token, config.teamId, {
      method: "PATCH",
      body: JSON.stringify({ ssoProtection: null }),
    });

    return project;
  }

  async deploy(
    projectId: string,
    files: ProviderFile[],
    framework: Framework,
    config: ProviderConfig
  ): Promise<ProviderDeployment> {
    const buildMap: Record<
      Framework,
      { buildCommand?: string; outputDirectory?: string }
    > = {
      nextjs: { buildCommand: "next build", outputDirectory: ".next" },
      vite: { buildCommand: "vite build", outputDirectory: "dist" },
      static: {},
    };

    const build = buildMap[framework];

    const vercelFiles = files.map((f) => ({
      file: f.path,
      data: Buffer.from(f.content).toString("base64"),
      encoding: "base64",
    }));

    const body: Record<string, unknown> = {
      name: projectId,
      files: vercelFiles,
      projectSettings: {
        ...build,
        framework: framework === "static" ? null : framework,
      },
    };

    const res = await vercelFetch(
      "/v13/deployments",
      config.token,
      config.teamId,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(
        `Failed to create deployment: ${err.error?.message || JSON.stringify(err)}`
      );
    }

    return res.json();
  }

  async setEnvVars(
    projectId: string,
    vars: EnvVar[],
    config: ProviderConfig
  ): Promise<void> {
    if (vars.length === 0) return;

    const res = await vercelFetch(
      `/v10/projects/${projectId}/env`,
      config.token,
      config.teamId,
      {
        method: "POST",
        body: JSON.stringify(vars),
      }
    );

    if (!res.ok) {
      for (const envVar of vars) {
        await vercelFetch(
          `/v10/projects/${projectId}/env`,
          config.token,
          config.teamId,
          {
            method: "POST",
            body: JSON.stringify([{ ...envVar, type: "encrypted" }]),
          }
        );
      }
    }
  }

  async deleteDeployment(
    deploymentId: string,
    config: ProviderConfig
  ): Promise<void> {
    const res = await vercelFetch(
      `/v13/deployments/${deploymentId}`,
      config.token,
      config.teamId,
      { method: "DELETE" }
    );

    if (!res.ok && res.status !== 404) {
      const err = await res.json();
      throw new Error(
        `Failed to delete deployment: ${err.error?.message || JSON.stringify(err)}`
      );
    }
  }

  getDeployUrl(deployment: ProviderDeployment): string {
    return `https://${deployment.url}`;
  }
}
