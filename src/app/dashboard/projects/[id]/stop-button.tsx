"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function StopProjectButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStop = async () => {
    setLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/stop`, { method: "POST" });
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        Stop project
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stop project?</DialogTitle>
          <DialogDescription>
            This will remove the Vercel deployment and make the app inaccessible.
            You can redeploy later via Claude.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleStop}
            disabled={loading}
          >
            {loading ? "Stopping..." : "Stop project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
