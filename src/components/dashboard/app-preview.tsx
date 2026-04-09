"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExternalLink,
  RefreshCw,
  Maximize2,
  Monitor,
  Smartphone,
} from "lucide-react";

type AppPreviewProps = {
  projectId: string;
  deployUrl: string;
};

type Viewport = "desktop" | "mobile";

export function AppPreview({ projectId, deployUrl }: AppPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewport, setViewport] = useState<Viewport>("desktop");

  const iframeSrc = `/api/auth/app-redirect?projectId=${projectId}`;
  const displayUrl = deployUrl.replace(/^https?:\/\//, "");

  return (
    <div className="rounded-lg border overflow-hidden bg-background">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-full bg-red-400/60" />
          <div className="size-3 rounded-full bg-yellow-400/60" />
          <div className="size-3 rounded-full bg-green-400/60" />
        </div>

        <div className="flex-1 mx-2">
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1 text-xs text-muted-foreground">
            <span className="truncate">{displayUrl}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={viewport === "desktop" ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => setViewport("desktop")}
          >
            <Monitor className="size-3" />
          </Button>
          <Button
            variant={viewport === "mobile" ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => setViewport("mobile")}
          >
            <Smartphone className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setLoading(true);
              setRefreshKey((k) => k + 1);
            }}
          >
            <RefreshCw className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() =>
              window.open(
                `/api/auth/app-redirect?projectId=${projectId}`,
                "_blank"
              )
            }
          >
            <ExternalLink className="size-3" />
          </Button>
        </div>
      </div>

      <div className="relative bg-muted/20 flex justify-center">
        {loading && (
          <div className="absolute inset-0 z-10">
            <Skeleton className="w-full h-full rounded-none" />
          </div>
        )}
        <iframe
          key={refreshKey}
          src={iframeSrc}
          title="App preview"
          className={`border-0 transition-all ${
            viewport === "mobile"
              ? "w-[375px] h-[667px] my-4 rounded-lg border shadow-lg"
              : "w-full h-[600px]"
          }`}
          onLoad={() => setLoading(false)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
