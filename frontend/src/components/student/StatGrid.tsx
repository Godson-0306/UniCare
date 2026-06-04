"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Tile {
  label: string;
  value: number | string;
  href: string;
  icon: LucideIcon;
}

export default function StatGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map(({ label, value, href, icon: Icon }) => (
        <Link key={href} href={href} className="group">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex items-center justify-between p-4 pb-2">
              <CardDescription className="text-sm text-slate-600">{label}</CardDescription>
              <div className="rounded-md bg-slate-50 p-2 text-teal-600">
                <Icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className={cn("text-2xl font-bold text-slate-900")}>{value}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
