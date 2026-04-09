import { describe, it, expect } from "vitest";
import { VercelProvider } from "@/lib/deploy/providers/vercel";
import type { ProviderConfig, ProviderFile } from "@/lib/deploy/providers/types";

const config: ProviderConfig = {
  token: "test-vercel-token",
  teamId: "team_test123",
};

const staticFiles: ProviderFile[] = [
  { path: "index.html", content: "<h1>Hello</h1>" },
  { path: "style.css", content: "body { color: red; }" },
];

const viteFiles: ProviderFile[] = [
  { path: "package.json", content: JSON.stringify({ name: "vite-app", dependencies: { vite: "^5" } }) },
  { path: "index.html", content: '<!DOCTYPE html><html><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>' },
  { path: "src/main.js", content: 'document.getElementById("app").innerHTML = "<h1>Vite App</h1>";' },
  { path: "vite.config.js", content: 'import { defineConfig } from "vite"; export default defineConfig({});' },
];

const nextjsFiles: ProviderFile[] = [
  { path: "package.json", content: JSON.stringify({ name: "next-app", dependencies: { next: "16.2.2", react: "^19" } }) },
  { path: "app/page.tsx", content: 'export default function Home() { return <h1>Next.js App</h1>; }' },
];

describe("VercelProvider", () => {
  const provider = new VercelProvider();

  it("has correct name", () => {
    expect(provider.name).toBe("vercel");
  });

  describe("project lifecycle", () => {
    it("creates a static project", async () => {
      const project = await provider.createProject("static-site", "static", config);
      expect(project).toHaveProperty("id");
      expect(project).toHaveProperty("name");
    });

    it("creates a vite project", async () => {
      const project = await provider.createProject("vite-app", "vite", config);
      expect(project).toHaveProperty("id");
      expect(project).toHaveProperty("name");
    });

    it("creates a nextjs project", async () => {
      const project = await provider.createProject("next-app", "nextjs", config);
      expect(project).toHaveProperty("id");
      expect(project).toHaveProperty("name");
    });

    it("deletes a project", async () => {
      await expect(
        provider.deleteProject("prj_test123", config)
      ).resolves.toBeUndefined();
    });
  });

  describe("deploy", () => {
    it("deploys static files", async () => {
      const deployment = await provider.deploy("prj_static-site", staticFiles, "static", config);
      expect(deployment).toHaveProperty("id");
      expect(deployment).toHaveProperty("url");
      expect(deployment.url).toContain("vercel.app");
    });

    it("deploys vite files", async () => {
      const deployment = await provider.deploy("prj_vite-app", viteFiles, "vite", config);
      expect(deployment).toHaveProperty("id");
      expect(deployment).toHaveProperty("url");
      expect(deployment.url).toContain("vercel.app");
    });

    it("deploys nextjs files", async () => {
      const deployment = await provider.deploy("prj_next-app", nextjsFiles, "nextjs", config);
      expect(deployment).toHaveProperty("id");
      expect(deployment).toHaveProperty("url");
      expect(deployment.url).toContain("vercel.app");
    });
  });

  describe("env vars", () => {
    it("sets environment variables", async () => {
      await expect(
        provider.setEnvVars("prj_test", [
          { key: "API_KEY", value: "sk-test", target: ["production", "preview"] },
        ], config)
      ).resolves.toBeUndefined();
    });
  });

  describe("cleanup", () => {
    it("deletes a deployment", async () => {
      await expect(
        provider.deleteDeployment("dpl_test123", config)
      ).resolves.toBeUndefined();
    });
  });

  it("generates correct deploy URL", () => {
    const url = provider.getDeployUrl({ id: "dpl_1", url: "my-app.vercel.app" });
    expect(url).toBe("https://my-app.vercel.app");
  });
});
