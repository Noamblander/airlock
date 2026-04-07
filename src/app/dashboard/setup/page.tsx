"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const text = {
  title: "Connect Claude Code",
  description: "One-time setup so Claude Code can publish apps for you",
  step1: "Click the button below to copy the connection settings",
  step2: "Open Claude Code and paste it (Ctrl+V / ⌘+V)",
  step3: "That's it! You can now tell Claude things like:",
  examples: [
    '"Build me a sales dashboard and publish it"',
    '"Show me my projects"',
    '"Update the homepage of project X"',
  ],
  button: "Copy settings",
  copied: "Copied! Now paste in Claude Code",
  generating: "Preparing...",
};

export default function MemberSetupPage() {
  const { data: me } = useSWR("/api/me", fetcher);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = text;

  const handleCopy = async () => {
    setLoading(true);

    // Generate token
    const res = await fetch("/api/auth/mcp-token", { method: "POST" });
    const { token } = await res.json();

    const appUrl = window.location.origin;

    const setupCommand = `Please save these configuration files so you can help me deploy apps:

Save this as ~/.mcp.json (create the file if it doesn't exist):
\`\`\`json
${JSON.stringify(
  {
    mcpServers: {
      "airlock": {
        url: `${appUrl}/api/mcp`,
        headers: { Authorization: `Bearer ${token}` },
      },
    },
  },
  null,
  2
)}
\`\`\`

Save this as ~/CLAUDE.md (create the file if it doesn't exist):
\`\`\`markdown
# ${me?.tenantName || "Organization"} — Claude Configuration

## Deployment
- To publish any app, use the \`deploy\` tool. Never ask the user to deploy manually.
- "publish this" / "deploy" = call deploy
- "show me my projects" = call list_projects
- "get the code for..." = call get_project
- "what API keys are available?" = call get_available_secrets
- Available frameworks: nextjs, vite, static
- All published apps are automatically secured.

## Conventions
- Use Tailwind CSS for styling
- Use shadcn/ui components when building UI
- Always include error handling and loading states
- Reference secrets by name in env_vars, never hardcode
\`\`\`

After saving both files, confirm they're saved.`;

    await navigator.clipboard.writeText(setupCommand);
    setLoading(false);
    setCopied(true);
    setTimeout(() => setCopied(false), 5000);
  };

  if (!me) return null;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-xl">{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* The one button */}
          <Button
            onClick={handleCopy}
            size="lg"
            className="w-full text-base py-6"
            disabled={loading}
            variant={copied ? "outline" : "default"}
          >
            {loading ? t.generating : copied ? t.copied : t.button}
          </Button>

          {/* Simple steps */}
          <div className="text-sm text-muted-foreground space-y-3 text-start">
            <div className="flex gap-2">
              <span className="font-bold text-foreground">1.</span>
              <span>{t.step1}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-foreground">2.</span>
              <span>{t.step2}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-foreground">3.</span>
              <span>{t.step3}</span>
            </div>
            <div className="space-y-1 pr-5">
              {t.examples.map((ex, i) => (
                <p key={i} className="text-xs italic">{ex}</p>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
