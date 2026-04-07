"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SecretForm } from "@/components/admin/secret-form";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SecretsPage() {
  const { data: secrets, isLoading, mutate } = useSWR("/api/secrets", fetcher);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [rotateId, setRotateId] = useState<string | null>(null);
  const [newValue, setNewValue] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const handleRevoke = async () => {
    if (!revokeId) return;
    setActionLoading(true);
    await fetch(`/api/secrets/${revokeId}`, { method: "DELETE" });
    setRevokeId(null);
    setActionLoading(false);
    mutate();
  };

  const handleRotate = async () => {
    if (!rotateId || !newValue) return;
    setActionLoading(true);
    await fetch(`/api/secrets/${rotateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: newValue }),
    });
    setRotateId(null);
    setNewValue("");
    setActionLoading(false);
    mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Secrets Vault</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage API keys and secrets for your projects
          </p>
        </div>
        <SecretForm onSuccess={() => mutate()} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Added by</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {secrets?.map(
              (s: {
                id: string;
                name: string;
                description: string;
                addedByName: string;
                createdAt: string;
              }) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.description || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.addedByName || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRotateId(s.id)}
                      >
                        Rotate
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setRevokeId(s.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      )}

      {/* Revoke dialog */}
      <Dialog open={!!revokeId} onOpenChange={() => setRevokeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke secret?</DialogTitle>
            <DialogDescription>
              This will permanently delete this secret and remove it from all
              projects. Deployed apps using this secret will lose access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={actionLoading}
            >
              {actionLoading ? "Revoking..." : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate dialog */}
      <Dialog open={!!rotateId} onOpenChange={() => setRotateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate secret</DialogTitle>
            <DialogDescription>
              Enter the new value. The old value will be replaced. Deployed apps
              will use the new value on next deploy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-value">New value</Label>
            <Input
              id="new-value"
              type="password"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Enter new secret value"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRotateId(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRotate}
              disabled={actionLoading || !newValue}
            >
              {actionLoading ? "Rotating..." : "Rotate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
