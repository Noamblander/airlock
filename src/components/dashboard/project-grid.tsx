"use client";

import { useState } from "react";
import useSWR from "swr";
import { ProjectCard } from "./project-card";
import { SearchBar } from "@/components/shared/search-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ProjectGrid() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (statusFilter !== "all") params.set("status", statusFilter);

  const { data: projects, isLoading } = useSWR(
    `/api/projects?${params.toString()}`,
    fetcher
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search projects..."
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="stopped">Stopped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">No projects yet</p>
          <p className="text-sm mt-1">
            Use Claude to create and deploy your first project.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map((p: Record<string, string | number | null>) => (
            <ProjectCard
              key={p.id as string}
              id={p.id as string}
              name={p.name as string}
              description={p.description as string | null}
              framework={p.framework as string}
              status={p.status as string}
              deployUrl={p.deployUrl as string | null}
              thumbnailUrl={p.thumbnailUrl as string | null}
              authorName={p.authorName as string | null}
              updatedAt={p.updatedAt as string | null}
              deploymentCount={Number(p.deploymentCount) || 0}
              lastDeployedAt={p.lastDeployedAt as string | null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
