"use client";

import useSWR from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function UserSettingsPage() {
  const { data: me } = useSWR("/api/me", fetcher);

  if (!me) return null;

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span>{me.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{me.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="capitalize">{me.role}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
