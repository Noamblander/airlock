import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { projects, deployments } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DeployHistory } from "@/components/dashboard/deploy-history";
import { AppPreview } from "@/components/dashboard/app-preview";
import { SharingDialog } from "@/components/dashboard/sharing-dialog";
import { StopProjectButton } from "./stop-button";
import { RefreshScreenshotButton } from "./refresh-screenshot-button";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { tenant } = await requireAuth();
  const { id } = await params;

  const [projectResult, deployStatsResult] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.tenantId, tenant.id)))
      .limit(1),
    db
      .select({ total: count(deployments.id) })
      .from(deployments)
      .where(eq(deployments.projectId, id)),
  ]);

  const [project] = projectResult;
  const [deployStats] = deployStatsResult;

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold">{project.name}</h2>
            <Badge variant={project.status === "live" ? "default" : "secondary"}>
              {project.status}
            </Badge>
          </div>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {project.deployUrl && project.status === "live" && (
            <a
              href={`/api/auth/app-redirect?projectId=${project.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            >
              Open app
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}
          <SharingDialog projectId={project.id} deployUrl={project.deployUrl} />
          {project.status === "live" && (
            <RefreshScreenshotButton projectId={project.id} />
          )}
          {project.status === "live" && (
            <StopProjectButton projectId={project.id} />
          )}
        </div>
      </div>

      {project.status === "stopped" && (
        <div className="rounded-lg border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          This project has been stopped and is no longer accessible. Redeploy it via Claude to bring it back online.
        </div>
      )}

      {project.deployUrl && project.status === "live" && (
        <AppPreview projectId={project.id} deployUrl={project.deployUrl} />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Framework
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{project.framework}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deployments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm font-semibold">{deployStats?.total ?? 0}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm">
              {project.createdAt.toLocaleDateString()}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm">
              {project.updatedAt.toLocaleDateString()}
            </span>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Deployment History</h3>
        <DeployHistory projectId={project.id} />
      </div>
    </div>
  );
}
