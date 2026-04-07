import { db } from "@/lib/db/client";
import {
  projects,
  deployments,
  secrets,
  projectSecrets,
  usageEvents,
  tenants,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { scanForSecrets } from "@/lib/secrets/scanner";
import { decrypt } from "@/lib/secrets/vault";
import {
  createOrGetVercelProject,
  createDeployment,
  setEnvironmentVariables,
  filesToVercelFormat,
} from "./vercel";
import { injectAuthMiddleware } from "./injector";
import type { DeployPayload, DeployResult, McpError } from "./types";

const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10MB

type OrchestratorContext = {
  userId: string;
  tenantId: string;
};

export async function orchestrateDeploy(
  payload: DeployPayload,
  ctx: OrchestratorContext
): Promise<DeployResult | McpError> {
  // 1. Get tenant config
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId))
    .limit(1);

  if (!tenant) {
    return { error: true, code: "TENANT_NOT_FOUND", message: "Tenant not found" };
  }

  if (!tenant.vercelApiToken || !tenant.vercelTeamId) {
    return {
      error: true,
      code: "VERCEL_NOT_CONFIGURED",
      message: "Vercel is not configured. Connect Vercel in admin settings first.",
    };
  }

  const vercelToken = decrypt(tenant.vercelApiToken);
  const vercelTeamId = tenant.vercelTeamId;

  // 2. Resolve files
  let files: Record<string, string>;

  if (payload.update_files) {
    // Partial update — merge with existing snapshot
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

  // 3. Validate payload size
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

  // 4. Scan for hardcoded secrets
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

  // 5. Inject auth middleware
  const tenantConfig = {
    platformUrl: process.env.NEXT_PUBLIC_APP_URL!,
    tenantSlug: tenant.slug,
    jwtSecret: process.env.JWT_SECRET!,
  };
  const filesWithAuth = injectAuthMiddleware(files, tenantConfig, payload.framework);

  // 6. Create or get Vercel project
  const projectSlug = payload.project_name.toLowerCase().replace(/\s+/g, "-");
  let vercelProject;
  try {
    vercelProject = await createOrGetVercelProject(
      projectSlug,
      vercelTeamId,
      vercelToken,
      payload.framework
    );
  } catch (err) {
    return {
      error: true,
      code: "VERCEL_PROJECT_FAILED",
      message: `Failed to create Vercel project: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }

  // 7. Decrypt and set env vars
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

    // Check for missing secrets
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
      await setEnvironmentVariables(
        vercelProject.id,
        envVars,
        vercelTeamId,
        vercelToken
      );
    } catch (err) {
      return {
        error: true,
        code: "ENV_VARS_FAILED",
        message: `Failed to set environment variables: ${err instanceof Error ? err.message : "Unknown error"}`,
      };
    }
  }

  // 8. Create Vercel deployment
  let vercelDeployment;
  try {
    const vercelFiles = filesToVercelFormat(filesWithAuth);
    vercelDeployment = await createDeployment(
      vercelProject.id,
      vercelFiles,
      vercelTeamId,
      vercelToken,
      payload.framework
    );
  } catch (err) {
    return {
      error: true,
      code: "DEPLOY_FAILED",
      message: `Deployment failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }

  // 9. Upsert project record
  const [existingProject] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.tenantId, ctx.tenantId),
        eq(projects.slug, projectSlug)
      )
    )
    .limit(1);

  let projectId: string;
  if (existingProject) {
    await db
      .update(projects)
      .set({
        vercelProjectId: vercelProject.id,
        vercelUrl: vercelDeployment.url,
        status: "live",
        framework: payload.framework,
        description: payload.description || existingProject.description,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, existingProject.id));
    projectId = existingProject.id;
  } else {
    const [newProject] = await db
      .insert(projects)
      .values({
        tenantId: ctx.tenantId,
        name: payload.project_name,
        slug: projectSlug,
        description: payload.description || "",
        framework: payload.framework,
        vercelProjectId: vercelProject.id,
        vercelUrl: vercelDeployment.url,
        status: "live",
        createdBy: ctx.userId,
      })
      .returning();
    projectId = newProject.id;
  }

  // 10. Store deployment with files_snapshot
  const [deployment] = await db
    .insert(deployments)
    .values({
      tenantId: ctx.tenantId,
      projectId,
      vercelDeployId: vercelDeployment.id,
      status: "success",
      url: vercelDeployment.url,
      filesSnapshot: files, // original files without injected middleware
      triggeredBy: ctx.userId,
    })
    .returning();

  // 11. Store project_secrets associations
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

    // Delete existing associations and re-create
    await db
      .delete(projectSecrets)
      .where(eq(projectSecrets.projectId, projectId));

    if (secretRecords.length > 0) {
      await db.insert(projectSecrets).values(
        secretRecords.map((s) => ({
          tenantId: ctx.tenantId,
          projectId,
          secretId: s.id,
        }))
      );
    }
  }

  // 12. Log usage_event
  await db.insert(usageEvents).values({
    tenantId: ctx.tenantId,
    projectId,
    userId: ctx.userId,
    eventType: "deploy",
    metadata: {
      framework: payload.framework,
      fileCount: Object.keys(files).length,
      totalSize: totalSize,
    },
  });

  return {
    url: `https://${vercelDeployment.url}`,
    status: "live",
    projectId,
    deploymentId: deployment.id,
  };
}
