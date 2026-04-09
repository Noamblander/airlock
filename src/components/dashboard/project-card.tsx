import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Rocket, Globe, FileCode, Layout } from "lucide-react";

type ProjectCardProps = {
  id: string;
  name: string;
  description: string | null;
  framework: string;
  status: string;
  deployUrl: string | null;
  thumbnailUrl: string | null;
  authorName: string | null;
  updatedAt: string | null;
  deploymentCount: number;
  lastDeployedAt: string | null;
};

function frameworkIcon(framework: string) {
  switch (framework) {
    case "nextjs":
      return <Globe className="size-4" />;
    case "vite":
      return <FileCode className="size-4" />;
    default:
      return <Layout className="size-4" />;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function ProjectCard({
  id,
  name,
  description,
  framework,
  status,
  deployUrl,
  thumbnailUrl,
  authorName,
  updatedAt,
  deploymentCount,
  lastDeployedAt,
}: ProjectCardProps) {
  return (
    <Link href={`/dashboard/projects/${id}`}>
      <Card className="hover:border-primary/50 transition-all cursor-pointer h-full overflow-hidden group">
        <div className="relative aspect-[16/10] bg-muted overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={`${name} preview`}
              className="w-full h-full object-cover object-top transition-transform group-hover:scale-[1.02]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <div className="text-muted-foreground/40">
                {frameworkIcon(framework)}
              </div>
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge
              variant={status === "live" ? "default" : "secondary"}
              className="text-[10px] px-1.5 py-0"
            >
              {status}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-sm leading-tight truncate">
              {name}
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                {frameworkIcon(framework)}
                {framework}
              </Badge>
              {deploymentCount > 0 && (
                <span className="flex items-center gap-1">
                  <Rocket className="size-3" />
                  {deploymentCount}
                </span>
              )}
            </div>
            {deployUrl && status === "live" && (
              <span
                role="button"
                tabIndex={0}
                className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md border bg-background px-2 h-6 text-[0.8rem] font-medium hover:bg-muted transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(
                    `/api/auth/app-redirect?projectId=${id}`,
                    "_blank"
                  );
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(
                      `/api/auth/app-redirect?projectId=${id}`,
                      "_blank"
                    );
                  }
                }}
              >
                <ExternalLink className="size-3" />
                View
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
            {authorName && <span>by {authorName}</span>}
            {lastDeployedAt ? (
              <span>{timeAgo(lastDeployedAt)}</span>
            ) : updatedAt ? (
              <span>{timeAgo(updatedAt)}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
