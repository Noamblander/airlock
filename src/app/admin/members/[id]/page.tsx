"use client";

import { useState, use } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MemberSetupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [memberName, setMemberName] = useState("");

  const handleGenerate = async () => {
    setLoading(true);

    const res = await fetch(`/api/admin/members/${id}/setup`, {
      method: "POST",
    });
    const setup = await res.json();
    setMemberName(setup.user.name);

    const appUrl = window.location.origin;

    // Build the full message the admin sends to the member
    const message = `Hey ${setup.user.name}!

I've set up your access to the platform. Just a one-time setup:

1. Go to: ${appUrl}
2. Sign in with your email
3. Click "Setup" in the sidebar
4. Click the "Copy settings" button
5. Open Claude Code and paste it there

That's it! From now on, just talk to Claude as usual.
When you want to publish something, say "deploy this" and it handles everything automatically.`;

    await navigator.clipboard.writeText(message);
    setLoading(false);
    setCopied(true);
    setTimeout(() => setCopied(false), 5000);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-xl">Setup Member</CardTitle>
          <CardDescription>
            Generate a ready-to-send message with setup instructions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGenerate}
            size="lg"
            className="w-full text-base py-6"
            disabled={loading}
            variant={copied ? "outline" : "default"}
          >
            {loading
              ? "Generating..."
              : copied
              ? `Copied! Send to ${memberName}`
              : "Copy setup message"}
          </Button>

          {copied && (
            <p className="text-sm text-muted-foreground">
              Message copied to clipboard. Send it via Slack, WhatsApp, or email.
              The member will follow the steps — no technical knowledge needed.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
