"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExternalLink, Rocket, Globe, FileCode, Layout, MoreVertical, FolderInput, FolderOpen } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type FolderItem = {
  id: string;
  name: string;
};

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
  onMoveToFolder?: (folderId: string | null) => void;
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
  onMoveToFolder,
}: ProjectCardProps) {
  const { data: folders } = useSWR<FolderItem[]>(
    onMoveToFolder ? "/api/folders" : null,
    fetcher
  );

  return (
    <div className="relative group/card h-full">
      <Link href={`/dashboard/projects/${id}`} className="block h-full">
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
            <div className="absolute top-2 right-2 flex items-center gap-1">
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

      {onMoveToFolder && (
        <div className="absolute top-2 left-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center justify-center size-6 rounded-md bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-background"
                onClick={(e) => e.preventDefault()}
              >
                <MoreVertical className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={(e) => e.preventDefault()}>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderInput className="size-3 mr-2" />
                  Move to folder
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onMoveToFolder(null)}>
                    <FolderOpen className="size-3 mr-2" />
                    No folder
                  </DropdownMenuItem>
                  {(folders || []).map((folder) => (
                    <DropdownMenuItem
                      key={folder.id}
                      onClick={() => onMoveToFolder(folder.id)}
                    >
                      <FolderInput className="size-3 mr-2" />
                      {folder.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
