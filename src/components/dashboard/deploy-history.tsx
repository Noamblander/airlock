"use client";

import useSWR from "swr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function DeployHistory({ projectId }: { projectId: string }) {
  const { data: deploys, isLoading } = useSWR(
    `/api/projects/${projectId}/deployments`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  if (!deploys?.length) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No deployments yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>URL</TableHead>
          <TableHead>Deployed by</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deploys.map(
          (d: {
            id: string;
            status: string;
            url: string;
            triggeredByName: string;
            createdAt: string;
          }) => (
            <TableRow key={d.id}>
              <TableCell>
                <Badge
                  variant={d.status === "success" ? "default" : "destructive"}
                >
                  {d.status}
                </Badge>
              </TableCell>
              <TableCell>
                {d.url ? (
                  <a
                    href={`https://${d.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {d.url}
                  </a>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-sm">
                {d.triggeredByName || "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(d.createdAt).toLocaleString()}
              </TableCell>
            </TableRow>
          )
        )}
      </TableBody>
    </Table>
  );
}
