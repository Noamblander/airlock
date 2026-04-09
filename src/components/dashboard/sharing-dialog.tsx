"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, Globe, Building2, Lock, Link2, X, UserPlus } from "lucide-react";
import { toast } from "sonner";

type Share = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  grantedAt: string;
};

type OrgUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const VISIBILITY_OPTIONS = [
  {
    value: "private",
    label: "Private",
    description: "Only you and shared users",
    icon: Lock,
  },
  {
    value: "organization",
    label: "Organization",
    description: "Anyone in your organization",
    icon: Building2,
  },
  {
    value: "link",
    label: "Anyone with link",
    description: "No login required",
    icon: Globe,
  },
] as const;

export function SharingDialog({
  projectId,
  deployUrl,
}: {
  projectId: string;
  deployUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const {
    data: sharingData,
    mutate: mutateSharingData,
  } = useSWR<{ visibility: string; shares: Share[] }>(
    open ? `/api/projects/${projectId}/sharing` : null,
    fetcher
  );

  const { data: orgUsers } = useSWR<OrgUser[]>(
    open && sharingData?.visibility === "private" ? "/api/users" : null,
    fetcher
  );

  const [visibility, setVisibility] = useState<string>("organization");

  useEffect(() => {
    if (sharingData?.visibility) {
      setVisibility(sharingData.visibility);
    }
  }, [sharingData?.visibility]);

  const handleVisibilityChange = async (newVisibility: string | null) => {
    if (!newVisibility) return;
    setVisibility(newVisibility);
    const res = await fetch(`/api/projects/${projectId}/sharing`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: newVisibility }),
    });
    if (res.ok) {
      mutateSharingData();
      toast.success(`Visibility changed to ${newVisibility}`);
    } else {
      toast.error("Failed to update visibility");
    }
  };

  const handleAddUser = async () => {
    if (!selectedUserId) return;
    const res = await fetch(`/api/projects/${projectId}/sharing`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addUserId: selectedUserId }),
    });
    if (res.ok) {
      mutateSharingData();
      setSelectedUserId("");
      setAddingUser(false);
      toast.success("User added");
    } else {
      toast.error("Failed to add user");
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    const res = await fetch(`/api/projects/${projectId}/sharing`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeShareId: shareId }),
    });
    if (res.ok) {
      mutateSharingData();
      toast.success("User removed");
    } else {
      toast.error("Failed to remove user");
    }
  };

  const handleCopyLink = () => {
    if (!deployUrl) return;
    const url = deployUrl.startsWith("https://")
      ? deployUrl
      : `https://${deployUrl}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const sharedUserIds = new Set(sharingData?.shares?.map((s) => s.userId) ?? []);
  const availableUsers = orgUsers?.filter((u) => !sharedUserIds.has(u.id)) ?? [];

  const currentOption = VISIBILITY_OPTIONS.find((o) => o.value === visibility);
  const Icon = currentOption?.icon ?? Building2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5" />
        }
      >
        <Share2 className="size-3.5" />
        Share
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share project</DialogTitle>
          <DialogDescription>
            Control who can access this deployed application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Visibility</label>
            <Select
              value={visibility}
              onValueChange={handleVisibilityChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    {currentOption?.label}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <opt.icon className="size-4 text-muted-foreground" />
                      <span>
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          — {opt.description}
                        </span>
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {visibility === "link" && deployUrl && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={handleCopyLink}
            >
              <Link2 className="size-3.5" />
              Copy link
            </Button>
          )}

          {visibility === "private" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Shared with</label>
                {!addingUser && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setAddingUser(true)}
                    className="gap-1"
                  >
                    <UserPlus className="size-3" />
                    Add
                  </Button>
                )}
              </div>

              {addingUser && (
                <div className="flex gap-2">
                  <Select
                    value={selectedUserId}
                    onValueChange={(v) => setSelectedUserId(v ?? "")}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </SelectItem>
                      ))}
                      {availableUsers.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          No more users to add
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleAddUser} disabled={!selectedUserId}>
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAddingUser(false);
                      setSelectedUserId("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {sharingData?.shares && sharingData.shares.length > 0 ? (
                <div className="space-y-1">
                  {sharingData.shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {share.userName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {share.userEmail}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemoveShare(share.id)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                !addingUser && (
                  <p className="text-xs text-muted-foreground">
                    Only the project creator and admins have access.
                  </p>
                )
              )}
            </div>
          )}

          {visibility === "organization" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="size-3.5 shrink-0" />
              All members in your organization can access this app.
            </div>
          )}

          {visibility !== "link" && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Lock className="size-3 mr-1" />
                Auth middleware active
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
