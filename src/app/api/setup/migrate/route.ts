import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import postgres from "postgres";

export async function POST(request: Request) {
  const { databaseUrl } = await request.json();

  const dbUrl = databaseUrl || process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json(
      { error: "No database URL provided" },
      { status: 400 }
    );
  }

  const sql = postgres(dbUrl, { prepare: false });

  try {
    // Run initial schema migration
    const schemaPath = join(
      process.cwd(),
      "supabase/migrations/0001_initial_schema.sql"
    );
    const schemaSql = readFileSync(schemaPath, "utf-8");
    await sql.unsafe(schemaSql);

    // Run RLS policies migration
    const rlsPath = join(
      process.cwd(),
      "supabase/migrations/0002_rls_policies.sql"
    );
    const rlsSql = readFileSync(rlsPath, "utf-8");
    await sql.unsafe(rlsSql);

    // Run provider abstraction migration
    const providerPath = join(
      process.cwd(),
      "supabase/migrations/0003_provider_abstraction.sql"
    );
    const providerSql = readFileSync(providerPath, "utf-8");
    await sql.unsafe(providerSql);

    // Add thumbnail_url to projects
    const thumbnailPath = join(
      process.cwd(),
      "supabase/migrations/0004_thumbnail_url.sql"
    );
    const thumbnailSql = readFileSync(thumbnailPath, "utf-8");
    await sql.unsafe(thumbnailSql);

    // Add project sharing (visibility + project_shares table)
    const sharingPath = join(
      process.cwd(),
      "supabase/migrations/0005_project_sharing.sql"
    );
    const sharingSql = readFileSync(sharingPath, "utf-8");
    await sql.unsafe(sharingSql);

    await sql.end();

    return NextResponse.json({ success: true });
  } catch (err) {
    await sql.end();
    const message =
      err instanceof Error ? err.message : "Migration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
