"use client";

import { useState } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Folder, FolderPlus, MoreHorizontal, Pencil, Trash2, FolderOpen } from "lucide-react";
import { toast } from "sonner";

type FolderItem = {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type FolderSidebarProps = {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
};

export function FolderSidebar({ selectedFolderId, onSelectFolder }: FolderSidebarProps) {
  const { data: folders, mutate } = useSWR<FolderItem[]>("/api/folders", fetcher);
  const [newFolderName, setNewFolderName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const rootFolders = (folders || []).filter((f) => !f.parentId);

  const handleCreate = async () => {
    if (!newFolderName.trim()) return;

    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim() }),
    });

    if (res.ok) {
      toast.success("Folder created");
      setNewFolderName("");
      setDialogOpen(false);
      mutate();
    } else {
      const err = await res.json().catch(() => null);
      toast.error(err?.error || "Failed to create folder");
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;

    const res = await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });

    if (res.ok) {
      toast.success("Folder renamed");
      setEditingId(null);
      mutate();
    } else {
      const err = await res.json().catch(() => null);
      toast.error(err?.error || "Failed to rename folder");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/folders/${id}`, { method: "DELETE" });

    if (res.ok) {
      toast.success("Folder deleted");
      if (selectedFolderId === id) onSelectFolder(null);
      mutate();
    } else {
      const err = await res.json().catch(() => null);
      toast.error(err?.error || "Failed to delete folder");
    }
  };

  return (
    <div className="w-48 shrink-0 space-y-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Folders</span>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button variant="ghost" size="icon" className="size-6" />}>
            <FolderPlus className="size-3.5" />
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>New Folder</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              className="space-y-4"
            >
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
                <Button type="submit" disabled={!newFolderName.trim()}>Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <button
        onClick={() => onSelectFolder(null)}
        className={cn(
          "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm transition-colors",
          selectedFolderId === null
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        )}
      >
        <FolderOpen className="size-4" />
        All Projects
      </button>

      {rootFolders.map((folder) => (
        <div key={folder.id} className="group flex items-center">
          {editingId === folder.id ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRename(folder.id);
              }}
              className="flex-1 flex items-center gap-1"
            >
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-7 text-sm"
                autoFocus
                onBlur={() => setEditingId(null)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
            </form>
          ) : (
            <>
              <button
                onClick={() => onSelectFolder(folder.id)}
                className={cn(
                  "flex items-center gap-2 flex-1 rounded-md px-2 py-1.5 text-sm transition-colors truncate",
                  selectedFolderId === folder.id
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Folder className="size-4 shrink-0" />
                <span className="truncate">{folder.name}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100 shrink-0" />}>
                  <MoreHorizontal className="size-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingId(folder.id);
                      setEditName(folder.name);
                    }}
                  >
                    <Pencil className="size-3 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(folder.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="size-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
