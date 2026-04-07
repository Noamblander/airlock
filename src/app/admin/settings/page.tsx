"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SettingsPage() {
  const { data: tenant, mutate } = useSWR("/api/tenant", fetcher);
  const { data: claudeMd } = useSWR("/api/tenant/claude-md", fetcher);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const body: Record<string, string> = {};

    const name = formData.get("name") as string;
    const vercelTeamId = formData.get("vercelTeamId") as string;
    const vercelApiToken = formData.get("vercelApiToken") as string;

    if (name) body.name = name;
    if (vercelTeamId) body.vercelTeamId = vercelTeamId;
    if (vercelApiToken) body.vercelApiToken = vercelApiToken;

    await fetch("/api/tenant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    mutate();
  };

  const handleCopyClaudeMd = () => {
    if (claudeMd?.content) {
      navigator.clipboard.writeText(claudeMd.content);
    }
  };

  if (!tenant) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your organization settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            Basic organization information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={tenant.name}
              />
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <div className="flex items-center gap-2">
                <Input value={tenant.domain} disabled />
                <Badge variant="outline">Verified</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={tenant.slug} disabled />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="vercelTeamId">Vercel Team ID</Label>
              <Input
                id="vercelTeamId"
                name="vercelTeamId"
                defaultValue={tenant.vercelTeamId || ""}
                placeholder="team_..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vercelApiToken">
                Vercel API Token{" "}
                {tenant.hasVercelToken && (
                  <Badge variant="secondary" className="ml-2">Connected</Badge>
                )}
              </Label>
              <Input
                id="vercelApiToken"
                name="vercelApiToken"
                type="password"
                placeholder={
                  tenant.hasVercelToken
                    ? "Enter new token to replace"
                    : "Enter Vercel API token"
                }
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CLAUDE.md</CardTitle>
          <CardDescription>
            Generated configuration file for Claude. Share this with your team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {claudeMd?.content ? (
            <div className="space-y-3">
              <pre className="rounded-md bg-muted p-4 text-sm overflow-auto max-h-96">
                {claudeMd.content}
              </pre>
              <Button variant="outline" onClick={handleCopyClaudeMd}>
                Copy to clipboard
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
