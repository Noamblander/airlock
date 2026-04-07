import type {
  Framework,
  VercelFile,
  VercelDeploymentResponse,
  VercelProjectResponse,
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

export async function createOrGetVercelProject(
  name: string,
  teamId: string | null,
  token: string,
  framework: Framework
): Promise<VercelProjectResponse> {
  // Try to get existing project
  const getRes = await vercelFetch(`/v9/projects/${name}`, token, teamId);
  if (getRes.ok) {
    return getRes.json();
  }

  // Create new project
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

  const createRes = await vercelFetch("/v11/projects", token, teamId, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(`Failed to create Vercel project: ${err.error?.message || JSON.stringify(err)}`);
  }

  return createRes.json();
}

export async function createDeployment(
  projectId: string,
  files: VercelFile[],
  teamId: string | null,
  token: string,
  framework: Framework
): Promise<VercelDeploymentResponse> {
  const buildMap: Record<Framework, { buildCommand?: string; outputDirectory?: string }> = {
    nextjs: { buildCommand: "next build", outputDirectory: ".next" },
    vite: { buildCommand: "vite build", outputDirectory: "dist" },
    static: {},
  };

  const build = buildMap[framework];

  const body: Record<string, unknown> = {
    name: projectId,
    files,
    projectSettings: {
      ...build,
      framework: framework === "static" ? null : framework,
    },
  };

  const res = await vercelFetch("/v13/deployments", token, teamId, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to create deployment: ${err.error?.message || JSON.stringify(err)}`);
  }

  return res.json();
}

export async function setEnvironmentVariables(
  projectId: string,
  envVars: { key: string; value: string; target: string[] }[],
  teamId: string | null,
  token: string
): Promise<void> {
  if (envVars.length === 0) return;

  const res = await vercelFetch(
    `/v10/projects/${projectId}/env`,
    token,
    teamId,
    {
      method: "POST",
      body: JSON.stringify(envVars),
    }
  );

  if (!res.ok) {
    // Env vars may already exist, try to update them
    for (const envVar of envVars) {
      await vercelFetch(
        `/v10/projects/${projectId}/env`,
        token,
        teamId,
        {
          method: "POST",
          body: JSON.stringify([{ ...envVar, type: "encrypted" }]),
        }
      );
    }
  }
}

export async function deleteDeployment(
  deploymentId: string,
  teamId: string | null,
  token: string
): Promise<void> {
  const res = await vercelFetch(
    `/v13/deployments/${deploymentId}`,
    token,
    teamId,
    { method: "DELETE" }
  );

  if (!res.ok && res.status !== 404) {
    const err = await res.json();
    throw new Error(`Failed to delete deployment: ${err.error?.message || JSON.stringify(err)}`);
  }
}

export function filesToVercelFormat(
  files: Record<string, string>
): VercelFile[] {
  return Object.entries(files).map(([path, content]) => ({
    file: path,
    data: Buffer.from(content).toString("base64"),
    encoding: "base64" as const,
  }));
}
