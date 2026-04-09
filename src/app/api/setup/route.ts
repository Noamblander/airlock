import { NextResponse } from "next/server";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import { z } from "zod";

const setupSchema = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
  supabaseServiceRoleKey: z.string().min(1),
  databaseUrl: z.string().min(1),
});

export async function GET() {
  // Check current config status
  const envPath = join(process.cwd(), ".env.local");
  const exists = existsSync(envPath);

  return NextResponse.json({
    configured: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    envFileExists: exists,
  });
}

export async function POST(request: Request) {
  let body;
  try {
    body = setupSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid input. All Supabase credentials and database URL are required." }, { status: 400 });
  }
  const envPath = join(process.cwd(), ".env.local");

  // Generate encryption key and JWT secret if not already set
  const encryptionKey = randomBytes(32).toString("hex");
  const jwtSecret = randomBytes(32).toString("hex");

  // Read existing .env.local if it exists, to preserve any manual additions
  let existing = "";
  if (existsSync(envPath)) {
    existing = readFileSync(envPath, "utf-8");
  }

  // Parse existing env vars to avoid duplicates
  const existingVars = new Set(
    existing
      .split("\n")
      .filter((line) => line.includes("=") && !line.startsWith("#"))
      .map((line) => line.split("=")[0].trim())
  );

  const newVars: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: body.supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: body.supabaseAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: body.supabaseServiceRoleKey,
    DATABASE_URL: body.databaseUrl,
    NEXT_PUBLIC_APP_URL: new URL(request.url).origin,
  };

  // Only add these if not already set
  if (!existingVars.has("ENCRYPTION_KEY")) {
    newVars.ENCRYPTION_KEY = encryptionKey;
  }
  if (!existingVars.has("ENCRYPTION_KEY_VERSION")) {
    newVars.ENCRYPTION_KEY_VERSION = "1";
  }
  if (!existingVars.has("JWT_SECRET")) {
    newVars.JWT_SECRET = jwtSecret;
  }

  // Build the new env content
  const lines = existing ? existing.split("\n") : [];

  for (const [key, value] of Object.entries(newVars)) {
    if (existingVars.has(key)) {
      // Update existing line
      const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
      if (idx !== -1) {
        lines[idx] = `${key}=${value}`;
      }
    } else {
      lines.push(`${key}=${value}`);
    }
  }

  writeFileSync(envPath, lines.join("\n") + "\n");

  return NextResponse.json({
    success: true,
    message: "Configuration saved to .env.local. The server needs to restart to pick up the new values.",
    restartRequired: true,
  });
}
