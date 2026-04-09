"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

export function RefreshScreenshotButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/screenshot`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={loading}
      className="gap-1.5"
    >
      <Camera className="size-3.5" />
      {loading ? "Capturing..." : "Refresh screenshot"}
    </Button>
  );
}
