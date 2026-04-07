"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type StepStatus = "pending" | "active" | "done" | "error";

export default function SetupPage() {
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [supabaseServiceRoleKey, setSupabaseServiceRoleKey] = useState("");
  const [databaseUrl, setDatabaseUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState("");

  const [stepStatus, setStepStatus] = useState<{
    credentials: StepStatus;
    migrate: StepStatus;
    done: StepStatus;
  }>({ credentials: "active", migrate: "pending", done: "pending" });

  const handleSaveAndMigrate = async () => {
    setError("");

    // Step 1: Save credentials
    setSaving(true);
    setStepStatus((s) => ({ ...s, credentials: "active" }));

    try {
      const saveRes = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseUrl,
          supabaseAnonKey,
          supabaseServiceRoleKey,
          databaseUrl,
        }),
      });

      if (!saveRes.ok) {
        const data = await saveRes.json();
        throw new Error(data.error || "Failed to save configuration");
      }

      setStepStatus((s) => ({ ...s, credentials: "done", migrate: "active" }));
      setSaving(false);
    } catch (err) {
      setSaving(false);
      setStepStatus((s) => ({ ...s, credentials: "error" }));
      setError(err instanceof Error ? err.message : "Failed to save");
      return;
    }

    // Step 2: Run migrations
    setMigrating(true);
    try {
      const migrateRes = await fetch("/api/setup/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseUrl }),
      });

      if (!migrateRes.ok) {
        const data = await migrateRes.json();
        throw new Error(data.error || "Migration failed");
      }

      setStepStatus((s) => ({ ...s, migrate: "done", done: "done" }));
    } catch (err) {
      setStepStatus((s) => ({ ...s, migrate: "error", done: "done" }));
      // Don't block — migrations might fail if already applied
      console.warn("Migration warning:", err);
    } finally {
      setMigrating(false);
    }
  };

  const isDone = stepStatus.done === "done";
  const isLoading = saving || migrating;

  const allFieldsFilled =
    supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey && databaseUrl;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold">Airlock</h1>
          <p className="text-muted-foreground mt-2">
            First-time setup — connect your Supabase project
          </p>
        </div>

        {isDone ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Setup complete!</CardTitle>
              <CardDescription>
                Restart the dev server for the changes to take effect
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted p-4 font-mono text-sm">
                <p className="text-muted-foreground mb-1"># Stop the server (Ctrl+C), then:</p>
                <p>npm run dev</p>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                After restarting, you&apos;ll be redirected to the login page where you
                can sign in with your email.
              </p>
              <Button
                className="w-full"
                onClick={() => window.location.href = "/"}
              >
                I&apos;ve restarted — take me to the app
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <StepBadge status={stepStatus.credentials} label="1. Credentials" />
              <span className="text-muted-foreground">&rarr;</span>
              <StepBadge status={stepStatus.migrate} label="2. Database" />
              <span className="text-muted-foreground">&rarr;</span>
              <StepBadge status={stepStatus.done} label="3. Done" />
            </div>

            {/* Where to find values */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Where to find these values</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  Open your{" "}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline dark:text-blue-400"
                  >
                    Supabase dashboard
                  </a>{" "}
                  and select your project.
                </p>
                <div className="grid grid-cols-1 gap-2 text-muted-foreground">
                  <div className="flex gap-2">
                    <span className="font-medium text-foreground min-w-[120px]">Project URL</span>
                    <span>Shown at the top of your project home page</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-medium text-foreground min-w-[120px]">API Keys</span>
                    <span>
                      Left sidebar &rarr; gear icon (Settings) &rarr; API
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-medium text-foreground min-w-[120px]">Database URL</span>
                    <span>
                      Green &quot;Connect&quot; button at top &rarr; pick connection string &rarr; replace [YOUR-PASSWORD]
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Supabase Credentials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supabaseUrl">Project URL</Label>
                  <Input
                    id="supabaseUrl"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://abc123.supabase.co"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supabaseAnonKey">anon public key</Label>
                  <Input
                    id="supabaseAnonKey"
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJhbGci..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supabaseServiceRoleKey">
                    service_role secret key
                  </Label>
                  <Input
                    id="supabaseServiceRoleKey"
                    type="password"
                    value={supabaseServiceRoleKey}
                    onChange={(e) => setSupabaseServiceRoleKey(e.target.value)}
                    placeholder="eyJhbGci..."
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="databaseUrl">Database connection string</Label>
                  <Input
                    id="databaseUrl"
                    type="password"
                    value={databaseUrl}
                    onChange={(e) => setDatabaseUrl(e.target.value)}
                    placeholder="postgresql://postgres.abc:password@..."
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSaveAndMigrate}
                  disabled={!allFieldsFilled || isLoading}
                >
                  {saving
                    ? "Saving credentials..."
                    : migrating
                    ? "Setting up database..."
                    : "Save & set up database"}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function StepBadge({ status, label }: { status: StepStatus; label: string }) {
  const variant =
    status === "done"
      ? "default"
      : status === "active"
      ? "secondary"
      : status === "error"
      ? "destructive"
      : "outline";

  return <Badge variant={variant}>{label}</Badge>;
}
