import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ProjectCardProps = {
  id: string;
  name: string;
  description: string | null;
  framework: string;
  status: string;
  vercelUrl: string | null;
  authorName: string | null;
  updatedAt: string | null;
};

export function ProjectCard({
  id,
  name,
  description,
  framework,
  status,
  vercelUrl,
  authorName,
  updatedAt,
}: ProjectCardProps) {
  return (
    <Link href={`/dashboard/projects/${id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{name}</CardTitle>
            <Badge variant={status === "live" ? "default" : "secondary"}>
              {status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {description}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {framework}
            </Badge>
            {authorName && <span>by {authorName}</span>}
            {updatedAt && (
              <span>
                {new Date(updatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
