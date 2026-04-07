"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type CloudProvider = "vercel" | "aws" | "cloudflare" | "netlify";

const CLOUD_FIELD_LABELS: Record<CloudProvider, { teamId: string; token: string; teamIdPlaceholder: string }> = {
  vercel: { teamId: "Team ID", token: "API Token", teamIdPlaceholder: "team_..." },
  aws: { teamId: "AWS Account ID", token: "Access Key / Token", teamIdPlaceholder: "123456789012" },
  cloudflare: { teamId: "Account ID", token: "API Token", teamIdPlaceholder: "abc123..." },
  netlify: { teamId: "Team Slug", token: "Personal Access Token", teamIdPlaceholder: "my-team" },
};

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
    const cloudTeamId = formData.get("cloudTeamId") as string;
    const cloudApiToken = formData.get("cloudApiToken") as string;

    if (name) body.name = name;
    if (cloudTeamId) body.cloudTeamId = cloudTeamId;
    if (cloudApiToken) body.cloudApiToken = cloudApiToken;

    await fetch("/api/tenant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    mutate();
  };

  const handleCloudProviderChange = async (value: string | null) => {
    if (!value) return;
    await fetch("/api/tenant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cloudProvider: value }),
    });
    mutate();
  };

  const handleDbProviderChange = async (value: string | null) => {
    if (!value) return;
    await fetch("/api/tenant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dbProvider: value === "none" ? null : value }),
    });
    mutate();
  };

  const handleCopyClaudeMd = () => {
    if (claudeMd?.content) {
      navigator.clipboard.writeText(claudeMd.content);
    }
  };

  if (!tenant) return null;

  const cloudProvider = (tenant.cloudProvider || "vercel") as CloudProvider;
  const cloudFields = CLOUD_FIELD_LABELS[cloudProvider];

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
              <Label>Cloud Provider</Label>
              <Select value={cloudProvider} onValueChange={handleCloudProviderChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vercel">Vercel</SelectItem>
                  <SelectItem value="aws">AWS (Amplify)</SelectItem>
                  <SelectItem value="cloudflare">Cloudflare Pages</SelectItem>
                  <SelectItem value="netlify">Netlify</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cloudTeamId">{cloudFields.teamId}</Label>
              <Input
                id="cloudTeamId"
                name="cloudTeamId"
                defaultValue={tenant.cloudTeamId || ""}
                placeholder={cloudFields.teamIdPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cloudApiToken">
                {cloudFields.token}{" "}
                {tenant.hasCloudToken && (
                  <Badge variant="secondary" className="ml-2">Connected</Badge>
                )}
              </Label>
              <Input
                id="cloudApiToken"
                name="cloudApiToken"
                type="password"
                placeholder={
                  tenant.hasCloudToken
                    ? "Enter new token to replace"
                    : "Enter API token"
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
          <CardTitle>Database</CardTitle>
          <CardDescription>
            Database for your team&apos;s deployed apps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Database Type</Label>
            <Select value={tenant.dbProvider || "none"} onValueChange={handleDbProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="postgres">PostgreSQL</SelectItem>
                <SelectItem value="mysql">MySQL</SelectItem>
                <SelectItem value="mongodb">MongoDB</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            The database connection string is stored as a secret named DATABASE_URL. Manage it in the Secrets page.
          </p>
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
