import { ProjectGrid } from "@/components/dashboard/project-grid";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Projects</h2>
        <p className="text-muted-foreground text-sm mt-1">
          All published apps and dashboards
        </p>
      </div>
      <ProjectGrid />
    </div>
  );
}
