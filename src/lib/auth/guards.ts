import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { users, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type AuthContext = {
  user: typeof users.$inferSelect;
  tenant: typeof tenants.$inferSelect;
};

export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    redirect("/login");
  }

  // Look up user directly by email (works regardless of domain match)
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, authUser.email))
    .limit(1);

  if (!user) {
    // No user record — check if there's a tenant for their domain
    const domain = authUser.email.split("@")[1];
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.domain, domain))
      .limit(1);

    if (tenant) {
      // Tenant exists but user doesn't — auto-create
      const [newUser] = await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: authUser.email,
          name:
            authUser.user_metadata?.full_name ||
            authUser.email.split("@")[0],
          role: "member",
          authProviderId: authUser.id,
        })
        .returning();

      return { user: newUser, tenant };
    }

    // No tenant either — go to onboarding
    redirect("/onboarding");
  }

  // User found — get their tenant
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1);

  if (!tenant) {
    redirect("/onboarding");
  }

  return { user, tenant };
}

export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await requireAuth();

  if (ctx.user.role !== "admin") {
    redirect("/dashboard");
  }

  return ctx;
}
