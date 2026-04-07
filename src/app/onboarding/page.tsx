"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type SecretEntry = { name: string; value: string; description: string };

const STEPS = ["Company", "Vercel", "Secrets", "Done"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Company
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");

  // Step 2: Vercel
  const [vercelTeamId, setVercelTeamId] = useState("");
  const [vercelApiToken, setVercelApiToken] = useState("");

  // Step 3: Secrets
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

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          slug,
          domain,
          vercelTeamId: vercelTeamId || undefined,
          vercelApiToken: vercelApiToken || undefined,
          secrets: validSecrets.length > 0 ? validSecrets : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Setup failed");
        return;
      }

      setStep(3); // Done
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Check the browser console for details.");
      console.error("Onboarding error:", err);
    } finally {
      setLoading(false);
    }
  };

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
                Connect your Vercel team to enable deployment. You can skip this and configure later in Settings.
              </p>
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950">
                <p className="font-medium mb-1">Where to find these:</p>
                <ol className="list-decimal pl-4 space-y-1 text-muted-foreground text-xs">
                  <li>
                    Go to{" "}
                    <a href="https://vercel.com/account/teams" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">
                      vercel.com/account/teams
                    </a>
                  </li>
                  <li><strong>Team ID</strong>: Settings &rarr; General &rarr; Team ID</li>
                  <li>
                    <strong>API Token</strong>: Go to{" "}
                    <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">
                      vercel.com/account/tokens
                    </a>{" "}
                    &rarr; Create Token
                  </li>
                </ol>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vercelTeamId">Vercel Team ID</Label>
                <Input
                  id="vercelTeamId"
                  value={vercelTeamId}
                  onChange={(e) => setVercelTeamId(e.target.value)}
                  placeholder="team_..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vercelApiToken">Vercel API Token</Label>
                <Input
                  id="vercelApiToken"
                  type="password"
                  value={vercelApiToken}
                  onChange={(e) => setVercelApiToken(e.target.value)}
                  placeholder="Enter Vercel API token"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(2)}>
                  {vercelTeamId ? "Next" : "Skip for now"}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
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
                <Button variant="outline" onClick={() => setStep(1)}>
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

          {step === 3 && (
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
