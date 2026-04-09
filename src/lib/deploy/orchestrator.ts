import { db } from "@/lib/db/client";
import {
  projects,
  deployments,
  secrets,
  projectSecrets,
  usageEvents,
  tenants,
} from "@/lib/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { scanForSecrets } from "@/lib/secrets/scanner";
import { decrypt } from "@/lib/secrets/vault";
import { getProvider } from "./providers/registry";
import { injectAuthMiddleware } from "./injector";
import type { DeployPayload, DeployResult, McpError } from "./types";
import type { CloudProvider, ProviderConfig } from "./providers/types";

const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10MB

type OrchestratorContext = {
  userId: string;
  tenantId: string;
};

export async function orchestrateDeploy(
  payload: DeployPayload,
  ctx: OrchestratorContext
): Promise<DeployResult | McpError> {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId))
    .limit(1);

  if (!tenant) {
    return { error: true, code: "TENANT_NOT_FOUND", message: "Tenant not found" };
  }

  if (!tenant.cloudApiToken || !tenant.cloudTeamId) {
    return {
      error: true,
      code: "CLOUD_NOT_CONFIGURED",
      message: `Cloud provider (${tenant.cloudProvider}) is not configured. Connect it in admin settings first.`,
    };
  }

  const cloudProvider = (tenant.cloudProvider || "vercel") as CloudProvider;
  const provider = getProvider(cloudProvider);
  const providerConfig: ProviderConfig = {
    token: decrypt(tenant.cloudApiToken),
    teamId: tenant.cloudTeamId,
    region: (tenant.cloudConfig as Record<string, unknown>)?.region as string | undefined,
    extra: tenant.cloudConfig as Record<string, unknown> | undefined,
  };

  // Resolve files
  let files: Record<string, string>;

  if (payload.update_files) {
    const slug = payload.project_name.toLowerCase().replace(/\s+/g, "-");
    const [existingProject] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.tenantId, ctx.tenantId),
          eq(projects.slug, slug)
        )
      )
      .limit(1);

    if (existingProject) {
      const [latestDeploy] = await db
        .select()
        .from(deployments)
        .where(eq(deployments.projectId, existingProject.id))
        .orderBy(desc(deployments.createdAt))
        .limit(1);

      const existingFiles =
        (latestDeploy?.filesSnapshot as Record<string, string>) || {};
      files = { ...existingFiles, ...payload.update_files };
    } else {
      files = payload.update_files;
    }
  } else if (payload.files) {
    files = payload.files;
  } else {
    return {
      error: true,
      code: "NO_FILES",
      message: "Either files or update_files must be provided",
    };
  }

  // Validate payload size
  const totalSize = Object.values(files).reduce(
    (sum, content) => sum + Buffer.byteLength(content, "utf8"),
    0
  );
  if (totalSize > MAX_PAYLOAD_BYTES) {
    return {
      error: true,
      code: "PAYLOAD_TOO_LARGE",
      message: `Total file payload is ${(totalSize / 1024 / 1024).toFixed(1)}MB, max is 10MB. Remove unnecessary assets or reference them via external URLs.`,
    };
  }

  // Scan for hardcoded secrets
  const scanResults = scanForSecrets(files);
  if (scanResults.length > 0) {
    const first = scanResults[0];
    return {
      error: true,
      code: "HARDCODED_SECRET_DETECTED",
      message: `Possible API key found in ${first.file} line ${first.line} (${first.pattern}). Use env_vars instead of hardcoding secrets.`,
      file: first.file,
      line: first.line,
    };
  }

  // Inject auth middleware
  const tenantConfig = {
    platformUrl: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL!,
    tenantSlug: tenant.slug,
    jwtSecret: process.env.JWT_SECRET!,
  };
  const filesWithAuth = injectAuthMiddleware(
    files,
    tenantConfig,
    payload.framework,
    cloudProvider
  );

  // Create or get project via provider
  const projectSlug = payload.project_name.toLowerCase().replace(/\s+/g, "-");
  let providerProject;
  try {
    providerProject = await provider.createProject(
      projectSlug,
      payload.framework,
      providerConfig
    );
  } catch (err) {
    return {
      error: true,
      code: "PROJECT_CREATE_FAILED",
      message: `Failed to create project on ${cloudProvider}: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }

  // Decrypt and set env vars
  if (payload.env_vars && payload.env_vars.length > 0) {
    const secretRecords = await db
      .select()
      .from(secrets)
      .where(
        and(
          eq(secrets.tenantId, ctx.tenantId),
          inArray(secrets.name, payload.env_vars)
        )
      );

    const foundNames = secretRecords.map((s) => s.name);
    const missing = payload.env_vars.filter((v) => !foundNames.includes(v));
    if (missing.length > 0) {
      return {
        error: true,
        code: "SECRET_NOT_FOUND",
        message: `Secrets not found: ${missing.join(", ")}. Use get_available_secrets to see available secrets.`,
      };
    }

    const envVars = secretRecords.map((s) => ({
      key: s.name,
      value: decrypt(s.encryptedValue),
      target: ["production", "preview"],
    }));

    try {
      await provider.setEnvVars(providerProject.id, envVars, providerConfig);
    } catch (err) {
      return {
        error: true,
        code: "ENV_VARS_FAILED",
        message: `Failed to set environment variables: ${err instanceof Error ? err.message : "Unknown error"}`,
      };
    }
  }

  // Deploy via provider
  let providerDeployment;
  try {
    const providerFiles = Object.entries(filesWithAuth).map(([path, content]) => ({
      path,
      content,
    }));
    providerDeployment = await provider.deploy(
      providerProject.id,
      providerFiles,
      payload.framework,
      providerConfig
    );
  } catch (err) {
    return {
      error: true,
      code: "DEPLOY_FAILED",
      message: `Deployment failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }

  const deployUrl = provider.getDeployUrl(providerDeployment);

  let projectId: string;
  let deploymentId: string;

  try {
    const result = await db.transaction(async (tx) => {
      const [existingProject] = await tx
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.tenantId, ctx.tenantId),
            eq(projects.slug, projectSlug)
          )
        )
        .limit(1);

      let txProjectId: string;
      if (existingProject) {
        await tx
          .update(projects)
          .set({
            providerProjectId: providerProject.id,
            deployUrl: providerDeployment.url,
            status: "live",
            framework: payload.framework,
            description: payload.description || existingProject.description,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, existingProject.id));
        txProjectId = existingProject.id;
      } else {
        const [newProject] = await tx
          .insert(projects)
          .values({
            tenantId: ctx.tenantId,
            name: payload.project_name,
            slug: projectSlug,
            description: payload.description || "",
            framework: payload.framework,
            providerProjectId: providerProject.id,
            deployUrl: providerDeployment.url,
            status: "live",
            createdBy: ctx.userId,
          })
          .returning();
        txProjectId = newProject.id;
      }

      const [deployment] = await tx
        .insert(deployments)
        .values({
          tenantId: ctx.tenantId,
          projectId: txProjectId,
          providerDeployId: providerDeployment.id,
          status: "success",
          url: deployUrl,
          filesSnapshot: files,
          triggeredBy: ctx.userId,
        })
        .returning();

      if (payload.env_vars && payload.env_vars.length > 0) {
        const secretRecords = await tx
          .select()
          .from(secrets)
          .where(
            and(
              eq(secrets.tenantId, ctx.tenantId),
              inArray(secrets.name, payload.env_vars)
            )
          );

        await tx
          .delete(projectSecrets)
          .where(eq(projectSecrets.projectId, txProjectId));

        if (secretRecords.length > 0) {
          await tx.insert(projectSecrets).values(
            secretRecords.map((s) => ({
              tenantId: ctx.tenantId,
              projectId: txProjectId,
              secretId: s.id,
            }))
          );
        }
      }

      await tx.insert(usageEvents).values({
        tenantId: ctx.tenantId,
        projectId: txProjectId,
        userId: ctx.userId,
        eventType: "deploy",
        metadata: {
          framework: payload.framework,
          cloudProvider,
          fileCount: Object.keys(files).length,
          totalSize,
        },
      });

      return { projectId: txProjectId, deploymentId: deployment.id };
    });

    projectId = result.projectId;
    deploymentId = result.deploymentId;
  } catch (dbErr) {
    console.error("DB transaction failed after successful deploy, attempting provider cleanup:", dbErr);
    try {
      await provider.deleteProject(providerProject.id, providerConfig);
    } catch (cleanupErr) {
      console.error("Provider cleanup also failed:", cleanupErr);
    }
    return {
      error: true,
      code: "DB_WRITE_FAILED",
      message: `Deployment succeeded on ${cloudProvider} but failed to save the record. The provider deployment has been cleaned up. Please try again.`,
    };
  }

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";

  if (appUrl) {
    const internalSecret = process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET;
    setTimeout(() => {
      fetch(`${appUrl}/api/projects/${projectId}/screenshot`, {
        method: "POST",
        headers: { Authorization: `Bearer ${internalSecret}` },
      }).catch(() => {});
    }, 15000);
  }

  return {
    url: deployUrl,
    dashboardUrl: appUrl ? `${appUrl}/dashboard/projects/${projectId}` : undefined,
    status: "live",
    projectId,
    deploymentId,
  };
}
