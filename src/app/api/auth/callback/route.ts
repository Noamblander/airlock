import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { users, tenants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser?.email) {
        const domain = authUser.email.split("@")[1];

        // Find tenant by domain
        const [tenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.domain, domain))
          .limit(1);

        if (tenant) {
          // Check if user exists
          const [existingUser] = await db
            .select()
            .from(users)
            .where(
              and(
                eq(users.tenantId, tenant.id),
                eq(users.email, authUser.email)
              )
            )
            .limit(1);

          if (!existingUser) {
            // Auto-create user if domain matches tenant
            await db.insert(users).values({
              tenantId: tenant.id,
              email: authUser.email,
              name: authUser.user_metadata?.full_name || authUser.email.split("@")[0],
              role: "member",
              authProviderId: authUser.id,
            });
          }
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
