"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type UserInviteFormProps = {
  onSuccess: () => void;
};

type InviteResult = {
  email: string;
  tempPassword: string;
  loginUrl: string;
};

export function UserInviteForm({ onSuccess }: UserInviteFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("member");
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const body = {
      email: formData.get("email") as string,
      name: formData.get("name") as string,
      role,
    };

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to invite user");
        return;
      }

      setInviteResult({
        email: data.email,
        tempPassword: data.tempPassword,
        loginUrl: data.loginUrl,
      });
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setInviteResult(null);
      setError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger render={<Button />}>
        Invite User
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{inviteResult ? "User Invited" : "Invite User"}</DialogTitle>
        </DialogHeader>
        {inviteResult ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share these credentials with the user so they can sign in:
            </p>
            <div className="rounded-md bg-muted p-4 font-mono text-sm space-y-2">
              <div><span className="text-muted-foreground">Login: </span>{inviteResult.loginUrl}</div>
              <div><span className="text-muted-foreground">Email: </span>{inviteResult.email}</div>
              <div><span className="text-muted-foreground">Password: </span>{inviteResult.tempPassword}</div>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(
                  `Login: ${inviteResult.loginUrl}\nEmail: ${inviteResult.email}\nPassword: ${inviteResult.tempPassword}`
                );
              }}
              variant="outline"
            >
              Copy to clipboard
            </Button>
            <Button className="w-full" onClick={() => handleClose(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="user@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Full name" required />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Inviting..." : "Invite User"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
