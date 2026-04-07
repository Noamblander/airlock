import type { Framework } from "../types";
import type {
  DeployProvider,
  ProviderConfig,
  ProviderFile,
  ProviderProject,
  ProviderDeployment,
  EnvVar,
} from "./types";

const NETLIFY_API = "https://api.netlify.com/api/v1";

async function netlifyFetch(
  path: string,
  config: ProviderConfig,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${NETLIFY_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export class NetlifyProvider implements DeployProvider {
  readonly name = "netlify" as const;

  async createProject(
    name: string,
    framework: Framework,
    config: ProviderConfig
  ): Promise<ProviderProject> {
    const teamSlug = config.teamId;

    const body: Record<string, unknown> = { name };
    if (teamSlug) {
      body.account_slug = teamSlug;
    }

    const buildSettingsMap: Record<Framework, Record<string, string>> = {
      nextjs: { cmd: "next build", dir: ".next" },
      vite: { cmd: "vite build", dir: "dist" },
      static: { cmd: "", dir: "." },
    };

    const settings = buildSettingsMap[framework];
    body.build_settings = {
      cmd: settings.cmd,
      dir: settings.dir,
    };

    const res = await netlifyFetch("/sites", config, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(
        `Failed to create Netlify site: ${err.message || JSON.stringify(err)}`
      );
    }

    const data = await res.json();
    return { id: data.id || data.site_id, name: data.name };
  }

  async deploy(
    projectId: string,
    files: ProviderFile[],
    _framework: Framework,
    config: ProviderConfig
  ): Promise<ProviderDeployment> {
    // Netlify deploy API uses a digest-based file upload
    // Step 1: compute SHA1 digests and create the deploy
    const fileDigests: Record<string, string> = {};
    const fileContents: Record<string, string> = {};

    for (const file of files) {
      const hash = await sha1Hex(file.content);
      fileDigests[`/${file.path}`] = hash;
      fileContents[hash] = file.content;
    }

    const createRes = await netlifyFetch(`/sites/${projectId}/deploys`, config, {
      method: "POST",
      body: JSON.stringify({
        files: fileDigests,
        async: false,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(
        `Failed to create Netlify deploy: ${err.message || JSON.stringify(err)}`
      );
    }

    const deploy = await createRes.json();

    // Step 2: upload any required files
    const required: string[] = deploy.required || [];
    for (const hash of required) {
      const content = fileContents[hash];
      if (!content) continue;

      await fetch(
        `${NETLIFY_API}/deploys/${deploy.id}/files/${hash}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${config.token}`,
            "Content-Type": "application/octet-stream",
          },
          body: content,
        }
      );
    }

    return {
      id: deploy.id,
      url: deploy.ssl_url || deploy.url || `${deploy.name}.netlify.app`,
    };
  }

  async setEnvVars(
    projectId: string,
    vars: EnvVar[],
    config: ProviderConfig
  ): Promise<void> {
    if (vars.length === 0) return;

    const envPayload = vars.map((v) => ({
      key: v.key,
      scopes: ["builds", "functions", "runtime"],
      values: [
        { context: "all", value: v.value },
      ],
    }));

    const res = await netlifyFetch(
      `/accounts/${config.teamId || "me"}/env`,
      config,
      {
        method: "POST",
        body: JSON.stringify(envPayload),
      }
    );

    if (!res.ok) {
      // Env vars may already exist — try updating individually
      for (const v of vars) {
        await netlifyFetch(
          `/accounts/${config.teamId || "me"}/env/${v.key}`,
          config,
          {
            method: "PUT",
            body: JSON.stringify({
              key: v.key,
              scopes: ["builds", "functions", "runtime"],
              values: [{ context: "all", value: v.value }],
            }),
          }
        );
      }
    }
  }

  async deleteDeployment(
    deploymentId: string,
    config: ProviderConfig
  ): Promise<void> {
    const res = await netlifyFetch(
      `/sites/${deploymentId}`,
      config,
      { method: "DELETE" }
    );

    if (!res.ok && res.status !== 404) {
      const err = await res.json();
      throw new Error(
        `Failed to delete Netlify site: ${err.message || JSON.stringify(err)}`
      );
    }
  }

  getDeployUrl(deployment: ProviderDeployment): string {
    const url = deployment.url;
    return url.startsWith("https://") ? url : `https://${url}`;
  }
}

async function sha1Hex(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
