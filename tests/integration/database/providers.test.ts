import { describe, it, expect } from "vitest";
import { generateClaudeMd } from "@/lib/templates/claude-md";

describe("Database Provider Configuration", () => {
  const baseTenant = {
    name: "Test Corp",
    slug: "test-corp",
    domain: "test.com",
    cloudProvider: "vercel",
  };

  describe("PostgreSQL", () => {
    it("generates CLAUDE.md with Postgres instructions", () => {
      const tenant = { ...baseTenant, dbProvider: "postgres" };
      const md = generateClaudeMd(tenant, ["OPENAI_API_KEY"]);

      expect(md).toContain("PostgreSQL");
      expect(md).toContain("DATABASE_URL");
      expect(md).toContain("Prisma");
      expect(md).toContain("Drizzle");
    });

    it("includes Postgres ORM conventions", () => {
      const tenant = { ...baseTenant, dbProvider: "postgres" };
      const md = generateClaudeMd(tenant, []);

      expect(md).toContain("Prisma or Drizzle ORM with PostgreSQL");
    });
  });

  describe("MySQL", () => {
    it("generates CLAUDE.md with MySQL instructions", () => {
      const tenant = { ...baseTenant, dbProvider: "mysql" };
      const md = generateClaudeMd(tenant, ["OPENAI_API_KEY"]);

      expect(md).toContain("MySQL");
      expect(md).toContain("DATABASE_URL");
      expect(md).toContain("mysql2");
    });

    it("includes MySQL ORM conventions", () => {
      const tenant = { ...baseTenant, dbProvider: "mysql" };
      const md = generateClaudeMd(tenant, []);

      expect(md).toContain("Prisma or Drizzle ORM with MySQL");
    });
  });

  describe("MongoDB", () => {
    it("generates CLAUDE.md with MongoDB instructions", () => {
      const tenant = { ...baseTenant, dbProvider: "mongodb" };
      const md = generateClaudeMd(tenant, ["OPENAI_API_KEY"]);

      expect(md).toContain("MongoDB");
      expect(md).toContain("DATABASE_URL");
      expect(md).toContain("Mongoose");
    });

    it("includes MongoDB conventions", () => {
      const tenant = { ...baseTenant, dbProvider: "mongodb" };
      const md = generateClaudeMd(tenant, []);

      expect(md).toContain("Mongoose with MongoDB");
    });
  });

  describe("No database", () => {
    it("generates CLAUDE.md without database section", () => {
      const tenant = { ...baseTenant, dbProvider: null };
      const md = generateClaudeMd(tenant, []);

      expect(md).not.toContain("## Database");
      expect(md).not.toContain("DATABASE_URL");
    });
  });

  describe("Cloud provider in CLAUDE.md", () => {
    it("shows Vercel", () => {
      const md = generateClaudeMd({ ...baseTenant, cloudProvider: "vercel" }, []);
      expect(md).toContain("Vercel");
    });

    it("shows AWS", () => {
      const md = generateClaudeMd({ ...baseTenant, cloudProvider: "aws" }, []);
      expect(md).toContain("AWS (Amplify)");
    });

    it("shows Cloudflare", () => {
      const md = generateClaudeMd({ ...baseTenant, cloudProvider: "cloudflare" }, []);
      expect(md).toContain("Cloudflare Pages");
    });

    it("shows Netlify", () => {
      const md = generateClaudeMd({ ...baseTenant, cloudProvider: "netlify" }, []);
      expect(md).toContain("Netlify");
    });
  });

  describe("Secrets in CLAUDE.md", () => {
    it("lists available secrets", () => {
      const md = generateClaudeMd(baseTenant, ["OPENAI_API_KEY", "STRIPE_KEY"]);
      expect(md).toContain("OPENAI_API_KEY, STRIPE_KEY");
    });

    it("shows none when no secrets", () => {
      const md = generateClaudeMd(baseTenant, []);
      expect(md).toContain("(none configured yet)");
    });
  });
});
