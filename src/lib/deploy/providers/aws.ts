import type { Framework } from "../types";
import type {
  DeployProvider,
  ProviderConfig,
  ProviderFile,
  ProviderProject,
  ProviderDeployment,
  EnvVar,
} from "./types";

const AMPLIFY_API = "https://amplify.{region}.amazonaws.com";

function amplifyUrl(region: string): string {
  return AMPLIFY_API.replace("{region}", region || "us-east-1");
}

async function amplifyFetch(
  path: string,
  config: ProviderConfig,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = amplifyUrl(config.region || "us-east-1");
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export class AwsProvider implements DeployProvider {
  readonly name = "aws" as const;

  async createProject(
    name: string,
    framework: Framework,
    config: ProviderConfig
  ): Promise<ProviderProject> {
    const frameworkMap: Record<Framework, string> = {
      nextjs: "WEB_COMPUTE",
      vite: "WEB",
      static: "WEB",
    };

    const res = await amplifyFetch("/apps", config, {
      method: "POST",
      body: JSON.stringify({
        name,
        platform: frameworkMap[framework],
        environmentVariables: {},
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(
        `Failed to create AWS Amplify app: ${err.message || JSON.stringify(err)}`
      );
    }

    const data = await res.json();
    return { id: data.app.appId, name: data.app.name };
  }

  async deploy(
    projectId: string,
    files: ProviderFile[],
    _framework: Framework,
    config: ProviderConfig
  ): Promise<ProviderDeployment> {
    const branchName = "main";

    // Ensure branch exists
    await amplifyFetch(`/apps/${projectId}/branches`, config, {
      method: "POST",
      body: JSON.stringify({
        branchName,
        enableAutoBuild: false,
      }),
    });

    // Create a zip of files as base64
    const fileMap: Record<string, string> = {};
    for (const f of files) {
      fileMap[f.path] = Buffer.from(f.content).toString("base64");
    }

    // Start deployment
    const deployRes = await amplifyFetch(
      `/apps/${projectId}/branches/${branchName}/deployments`,
      config,
      {
        method: "POST",
        body: JSON.stringify({ fileMap }),
      }
    );

    if (!deployRes.ok) {
      const err = await deployRes.json();
      throw new Error(
        `Failed to deploy to AWS Amplify: ${err.message || JSON.stringify(err)}`
      );
    }

    const data = await deployRes.json();
    const region = config.region || "us-east-1";
    return {
      id: data.jobSummary?.jobId || data.jobId || projectId,
      url: `${branchName}.${projectId}.amplifyapp.com`,
      readyState: "PENDING",
    };
  }

  async setEnvVars(
    projectId: string,
    vars: EnvVar[],
    config: ProviderConfig
  ): Promise<void> {
    if (vars.length === 0) return;

    const environmentVariables: Record<string, string> = {};
    for (const v of vars) {
      environmentVariables[v.key] = v.value;
    }

    const res = await amplifyFetch(`/apps/${projectId}`, config, {
      method: "POST",
      body: JSON.stringify({ environmentVariables }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(
        `Failed to set env vars on AWS Amplify: ${err.message || JSON.stringify(err)}`
      );
    }
  }

  async deleteDeployment(
    deploymentId: string,
    config: ProviderConfig
  ): Promise<void> {
    const res = await amplifyFetch(`/apps/${deploymentId}`, config, {
      method: "DELETE",
    });

    if (!res.ok && res.status !== 404) {
      const err = await res.json();
      throw new Error(
        `Failed to delete AWS Amplify app: ${err.message || JSON.stringify(err)}`
      );
    }
  }

  async deleteProject(
    projectId: string,
    config: ProviderConfig
  ): Promise<void> {
    const res = await amplifyFetch(`/apps/${projectId}`, config, {
      method: "DELETE",
    });

    if (!res.ok && res.status !== 404) {
      const err = await res.json();
      throw new Error(
        `Failed to delete AWS Amplify app: ${err.message || JSON.stringify(err)}`
      );
    }
  }

  getDeployUrl(deployment: ProviderDeployment): string {
    return `https://${deployment.url}`;
  }
}
