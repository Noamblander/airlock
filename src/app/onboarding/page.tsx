"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SecretEntry = { name: string; value: string; description: string };
type CloudProvider = "vercel" | "aws" | "cloudflare" | "netlify";
type DbProvider = "postgres" | "mysql" | "mongodb";

const STEPS = ["Company", "Cloud", "Database", "Secrets", "Done"];

const CLOUD_PROVIDERS: { value: CloudProvider; label: string; description: string }[] = [
  { value: "vercel", label: "Vercel", description: "Best for Next.js and frontend apps" },
  { value: "aws", label: "AWS (Amplify)", description: "Amazon Web Services — Amplify hosting" },
  { value: "cloudflare", label: "Cloudflare Pages", description: "Edge-first with global CDN" },
  { value: "netlify", label: "Netlify", description: "Git-based deploys with serverless functions" },
];

const CLOUD_FIELD_LABELS: Record<CloudProvider, { teamId: string; token: string; teamIdPlaceholder: string; helpUrl: string; helpLabel: string }> = {
  vercel: {
    teamId: "Team ID",
    token: "API Token",
    teamIdPlaceholder: "team_...",
    helpUrl: "https://vercel.com/account/tokens",
    helpLabel: "vercel.com/account/tokens",
  },
  aws: {
    teamId: "AWS Account ID",
    token: "Access Key / Token",
    teamIdPlaceholder: "123456789012",
    helpUrl: "https://console.aws.amazon.com/iam",
    helpLabel: "AWS IAM Console",
  },
  cloudflare: {
    teamId: "Account ID",
    token: "API Token",
    teamIdPlaceholder: "abc123...",
    helpUrl: "https://dash.cloudflare.com/profile/api-tokens",
    helpLabel: "Cloudflare API Tokens",
  },
  netlify: {
    teamId: "Team Slug",
    token: "Personal Access Token",
    teamIdPlaceholder: "my-team",
    helpUrl: "https://app.netlify.com/user/applications#personal-access-tokens",
    helpLabel: "Netlify Access Tokens",
  },
};

const DB_PROVIDERS: { value: DbProvider; label: string; placeholder: string }[] = [
  { value: "postgres", label: "PostgreSQL", placeholder: "postgresql://user:pass@host:5432/db" },
  { value: "mysql", label: "MySQL", placeholder: "mysql://user:pass@host:3306/db" },
  { value: "mongodb", label: "MongoDB", placeholder: "mongodb+srv://user:pass@cluster.mongodb.net/db" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Company
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");

  // Step 2: Cloud
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>("vercel");
  const [cloudTeamId, setCloudTeamId] = useState("");
  const [cloudApiToken, setCloudApiToken] = useState("");
  const [cloudRegion, setCloudRegion] = useState("");

  // Step 3: Database
  const [dbProvider, setDbProvider] = useState<DbProvider | "">("");
  const [dbConnectionString, setDbConnectionString] = useState("");

  // Step 4: Secrets
  const [secretEntries, setSecretEntries] = useState<SecretEntry[]>([]);

  const handleNameChange = (value: string) => {
    setCompanyName(value);
    setSlug(value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"));
  };

  const addSecret = () => {
    setSecretEntries([...secretEntries, { name: "", value: "", description: "" }]);
  };

  const updateSecret = (index: number, field: keyof SecretEntry, value: string) => {
    const updated = [...secretEntries];
    updated[index][field] = value;
    setSecretEntries(updated);
  };

  const removeSecret = (index: number) => {
    setSecretEntries(secretEntries.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    const validSecrets = secretEntries.filter((s) => s.name && s.value);

    // If DB connection string is provided, add it as a secret too
    if (dbProvider && dbConnectionString) {
      validSecrets.push({
        name: "DATABASE_URL",
        value: dbConnectionString,
        description: `${dbProvider} connection string for deployed apps`,
      });
    }

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          slug,
          domain,
          cloudProvider,
          cloudTeamId: cloudTeamId || undefined,
          cloudApiToken: cloudApiToken || undefined,
          cloudConfig: cloudRegion ? { region: cloudRegion } : undefined,
          dbProvider: dbProvider || undefined,
          dbConfig: dbConnectionString ? { connectionString: "stored_as_secret" } : undefined,
          secrets: validSecrets.length > 0 ? validSecrets : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Setup failed");
        return;
      }

      setStep(4); // Done
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Check the browser console for details.");
      console.error("Onboarding error:", err);
    } finally {
      setLoading(false);
    }
  };

  const cloudFields = CLOUD_FIELD_LABELS[cloudProvider];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Set Up Airlock</CardTitle>
          <CardDescription>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </CardDescription>
          <div className="flex justify-center gap-2 pt-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-12 rounded-full ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Acme Inc"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="acme"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Email Domain</Label>
                <Input
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="acme.com"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => setStep(1)}
                disabled={!companyName || !slug || !domain}
              >
                Next
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose where your team&apos;s apps will be deployed. You can change this later in Settings.
              </p>

              <div className="space-y-2">
                <Label>Cloud Provider</Label>
                <Select value={cloudProvider} onValueChange={(v) => setCloudProvider(v as CloudProvider)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLOUD_PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div>
                          <span className="font-medium">{p.label}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{p.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950">
                <p className="font-medium mb-1">Where to find credentials:</p>
                <p className="text-muted-foreground text-xs">
                  Go to{" "}
                  <a href={cloudFields.helpUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">
                    {cloudFields.helpLabel}
                  </a>{" "}
                  to create your API token.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cloudTeamId">{cloudFields.teamId}</Label>
                <Input
                  id="cloudTeamId"
                  value={cloudTeamId}
                  onChange={(e) => setCloudTeamId(e.target.value)}
                  placeholder={cloudFields.teamIdPlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cloudApiToken">{cloudFields.token}</Label>
                <Input
                  id="cloudApiToken"
                  type="password"
                  value={cloudApiToken}
                  onChange={(e) => setCloudApiToken(e.target.value)}
                  placeholder="Enter API token"
                />
              </div>

              {cloudProvider === "aws" && (
                <div className="space-y-2">
                  <Label htmlFor="cloudRegion">Region</Label>
                  <Input
                    id="cloudRegion"
                    value={cloudRegion}
                    onChange={(e) => setCloudRegion(e.target.value)}
                    placeholder="us-east-1"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(2)}>
                  {cloudTeamId ? "Next" : "Skip for now"}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Optionally configure a database for your team&apos;s deployed apps.
                Claude will use this when building apps that need data storage.
              </p>

              <div className="space-y-2">
                <Label>Database Type</Label>
                <Select value={dbProvider} onValueChange={(v) => setDbProvider(v as DbProvider)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a database (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {DB_PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {dbProvider && (
                <div className="space-y-2">
                  <Label htmlFor="dbConnectionString">Connection String</Label>
                  <Input
                    id="dbConnectionString"
                    type="password"
                    value={dbConnectionString}
                    onChange={(e) => setDbConnectionString(e.target.value)}
                    placeholder={DB_PROVIDERS.find((p) => p.value === dbProvider)?.placeholder}
                  />
                  <p className="text-xs text-muted-foreground">
                    Stored encrypted. Injected as DATABASE_URL into deployed apps.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(3)}>
                  {dbProvider ? "Next" : "Skip for now"}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Optionally add API keys that your projects can use. You can always add these later in the admin dashboard.
              </p>
              {secretEntries.map((entry, i) => (
                <div key={i} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <Label>Secret {i + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSecret(i)}
                    >
                      Remove
                    </Button>
                  </div>
                  <Input
                    value={entry.name}
                    onChange={(e) => updateSecret(i, "name", e.target.value)}
                    placeholder="OPENAI_API_KEY"
                  />
                  <Input
                    type="password"
                    value={entry.value}
                    onChange={(e) => updateSecret(i, "value", e.target.value)}
                    placeholder="sk-..."
                  />
                  <Input
                    value={entry.description}
                    onChange={(e) =>
                      updateSecret(i, "description", e.target.value)
                    }
                    placeholder="Description (optional)"
                  />
                </div>
              ))}
              {secretEntries.length > 0 && (
                <Button variant="outline" onClick={addSecret} className="w-full">
                  + Add another secret
                </Button>
              )}
              {secretEntries.length === 0 && (
                <Button variant="outline" onClick={addSecret} className="w-full">
                  + Add a secret
                </Button>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? "Setting up..." : secretEntries.some(s => s.name && s.value) ? "Complete Setup" : "Skip & Complete Setup"}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-center">
              <div className="text-4xl">&#10003;</div>
              <h3 className="text-lg font-semibold">Setup Complete!</h3>
              <p className="text-sm text-muted-foreground">
                Your organization is ready. Download the CLAUDE.md file and
                share it with your team to start deploying apps.
              </p>
              <Separator />
              <Button className="w-full" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
