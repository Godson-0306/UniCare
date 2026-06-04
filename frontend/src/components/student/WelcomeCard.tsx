"use client";

import { User } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  fullName?: string | null;
  matric?: string | null;
  lastVisit?: string | null;
  summary?: string | null;
  department?: string | null;
  faculty?: string | null;
  level?: string | null;
}

export default function WelcomeCard({ fullName, matric, lastVisit, summary, department, faculty, level }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex items-start justify-between gap-4 p-6 pb-2">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-lg bg-teal-50 text-teal-700">
            <User className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-xl">{fullName ?? "Student"}</CardTitle>
            <CardDescription className="text-sm text-slate-500">{matric ?? "—"}</CardDescription>
            <div className="mt-1 text-xs text-slate-600">
              {department && <span>{department}</span>}
              {faculty && <span className="ml-2">• {faculty}</span>}
              {level && <span className="ml-2">• Level {level}</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">Last visit</p>
          <p className="text-base font-semibold text-slate-900">{lastVisit ?? "No recent visits"}</p>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-6 p-6 pt-0">
        <div className="max-w-lg text-sm text-slate-700">{summary ?? "No health summary available."}</div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild>
            <Link href="/student/medical-history">View Medical History</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/student/contact">Contact Centre</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
