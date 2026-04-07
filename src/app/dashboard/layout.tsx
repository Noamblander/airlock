import { requireAuth } from "@/lib/auth/guards";
import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAuth();

  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={user.role} />
      <div className="flex-1 flex flex-col">
        <Header userName={user.name} userEmail={user.email} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
