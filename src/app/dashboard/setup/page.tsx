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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Tool = "claude-code" | "cursor" | "windsurf" | "manual";

const TOOLS: {
  id: Tool;
  name: string;
  description: string;
  configPath: string;
  rulesPath: string;
  pasteTarget: string;
  examples: string[];
}[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    description: "Anthropic's agentic CLI for software development",
    configPath: "~/.mcp.json",
    rulesPath: "~/CLAUDE.md",
    pasteTarget: "Claude Code terminal",
    examples: [
      '"Build me a sales dashboard and publish it"',
      '"Show me my projects"',
      '"Update the homepage of project X"',
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "AI-first code editor with built-in MCP support",
    configPath: ".cursor/mcp.json",
    rulesPath: ".cursorrules",
    pasteTarget: "Cursor chat (Agent mode)",
    examples: [
      '"Build a CRM dashboard and deploy it"',
      '"List my deployed projects"',
      '"Add a contact form to project X and redeploy"',
    ],
  },
  {
    id: "windsurf",
    name: "Windsurf",
    description: "Codeium's agentic IDE with Cascade AI",
    configPath: "~/.codeium/windsurf/mcp_config.json",
    rulesPath: ".windsurfrules",
    pasteTarget: "Windsurf chat (Cascade)",
    examples: [
      '"Create an inventory tracker and publish it"',
      '"Show my existing deployments"',
      '"Update the styling on project X"',
    ],
  },
  {
    id: "manual",
    name: "Other / Manual",
    description: "Any tool that supports MCP (VS Code + Copilot, Cline, etc.)",
    configPath: "your MCP config file",
    rulesPath: "your rules file",
    pasteTarget: "your AI tool",
    examples: [],
  },
];

function buildMcpConfig(appUrl: string, token: string) {
  return {
    mcpServers: {
      airlock: {
        url: `${appUrl}/api/mcp`,
        headers: { Authorization: `Bearer ${token}` },
      },
    },
  };
}

function buildClipboardContent(
  tool: Tool,
  appUrl: string,
  token: string,
  rulesContent: string
) {
  const mcpConfig = buildMcpConfig(appUrl, token);
  const configJson = JSON.stringify(mcpConfig, null, 2);
  const toolDef = TOOLS.find((t) => t.id === tool)!;

  if (tool === "manual") {
    return `MCP Server Configuration:

${configJson}

Instructions / Rules:

${rulesContent}`;
  }

  return `Please save these configuration files so you can help me deploy apps:

Save this as ${toolDef.configPath} (create the file if it doesn't exist):
\`\`\`json
${configJson}
\`\`\`

Save this as ${toolDef.rulesPath} (create the file if it doesn't exist):
\`\`\`markdown
${rulesContent}
\`\`\`

After saving both files, confirm they're saved.`;
}

export default function SetupPage() {
  const { data: me } = useSWR("/api/me", fetcher);
  const { data: claudeMd } = useSWR("/api/tenant/claude-md", fetcher);
  const [activeTool, setActiveTool] = useState<Tool>("claude-code");
  const [copiedTool, setCopiedTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCopy = async (tool: Tool) => {
    setLoading(true);

    const res = await fetch("/api/auth/mcp-token", { method: "POST" });
    const { token } = await res.json();

    const appUrl = window.location.origin;
    const rulesContent =
      claudeMd?.content ||
      `# ${me?.tenantName || "Organization"} — Configuration`;

    const content = buildClipboardContent(tool, appUrl, token, rulesContent);

    await navigator.clipboard.writeText(content);
    setLoading(false);
    setCopiedTool(tool);
    toast.success(
      tool === "manual"
        ? "Configuration copied to clipboard"
        : `Settings copied! Paste in ${TOOLS.find((t) => t.id === tool)!.pasteTarget}`
    );
    setTimeout(() => setCopiedTool(null), 5000);
  };

  if (!me) return null;

  const currentTool = TOOLS.find((t) => t.id === activeTool)!;
  const isCopied = copiedTool === activeTool;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Connect your AI tool</h2>
        <p className="text-muted-foreground mt-1">
          One-time setup so your AI assistant can publish apps for you
        </p>
      </div>

      <Tabs
        value={activeTool}
        onValueChange={(v) => setActiveTool(v as Tool)}
      >
        <TabsList className="w-full">
          {TOOLS.map((tool) => (
            <TabsTrigger key={tool.id} value={tool.id} className="flex-1">
              {tool.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {TOOLS.map((tool) => (
          <TabsContent key={tool.id} value={tool.id}>
            <Card>
              <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <CardTitle className="text-xl">
                    Connect {tool.name}
                  </CardTitle>
                  {tool.id !== "manual" && (
                    <Badge variant="outline" className="text-xs">
                      MCP
                    </Badge>
                  )}
                </div>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button
                  onClick={() => handleCopy(tool.id)}
                  size="lg"
                  className="w-full text-base py-6"
                  disabled={loading}
                  variant={isCopied && activeTool === tool.id ? "outline" : "default"}
                >
                  {loading
                    ? "Preparing..."
                    : isCopied && activeTool === tool.id
                      ? `Copied! Now paste in ${tool.pasteTarget}`
                      : tool.id === "manual"
                        ? "Copy configuration"
                        : "Copy settings"}
                </Button>

                {tool.id !== "manual" ? (
                  <div className="text-sm text-muted-foreground space-y-3 text-start">
                    <div className="flex gap-2">
                      <span className="font-bold text-foreground">1.</span>
                      <span>Click the button above to copy the connection settings</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold text-foreground">2.</span>
                      <span>
                        Open <span className="font-medium text-foreground">{tool.name}</span> and
                        paste it (Ctrl+V / ⌘+V)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold text-foreground">3.</span>
                      <span>
                        {tool.name} will save{" "}
                        <code className="rounded bg-muted px-1 py-0.5 text-xs">
                          {tool.configPath}
                        </code>{" "}
                        and{" "}
                        <code className="rounded bg-muted px-1 py-0.5 text-xs">
                          {tool.rulesPath}
                        </code>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold text-foreground">4.</span>
                      <span>That's it! You can now say things like:</span>
                    </div>
                    {tool.examples.length > 0 && (
                      <div className="space-y-1 pl-5">
                        {tool.examples.map((ex, i) => (
                          <p key={i} className="text-xs italic">
                            {ex}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground space-y-3 text-start">
                    <p>
                      The copied text includes the MCP server configuration (JSON) and the
                      instructions/rules content. Use these with any tool that supports the{" "}
                      <a
                        href="https://modelcontextprotocol.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        Model Context Protocol
                      </a>
                      .
                    </p>
                    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                      <p className="font-medium text-foreground text-xs">Compatible tools include:</p>
                      <ul className="text-xs space-y-1 list-disc pl-4">
                        <li>VS Code + GitHub Copilot</li>
                        <li>Cline (VS Code extension)</li>
                        <li>Continue (VS Code / JetBrains)</li>
                        <li>Any MCP-compatible client</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
