"use client";

import { useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";

const studentNav = [
  { label: "Dashboard", href: "/student/dashboard" },
  { label: "Emergency", href: "/student/emergency" },
];

const EMERGENCY_NUMBER = process.env.NEXT_PUBLIC_EMERGENCY_NUMBER ?? "+2348000000000";

export default function StudentEmergencyPage() {
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function triggerEmergency() {
    setLoading(true);
    setStatus(null);
    try {
      const position = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });

      const { data } = await apiClient.post("/student/emergency/", {
        description,
        latitude: position?.coords.latitude,
        longitude: position?.coords.longitude,
        location_label: position ? "Shared live location" : "",
      });

      window.location.href = `tel:${EMERGENCY_NUMBER}`;

      if (data.success) {
        setStatus("Emergency alert sent. The hospital has been notified and your dialer is opening.");
      }
    } catch {
      setStatus("Failed to send emergency alert. Please call the campus emergency line immediately.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell title="Emergency" navItems={studentNav}>
      <Card className="max-w-lg border-red-200">
        <CardHeader>
          <CardTitle className="text-red-800">Emergency Assistance</CardTitle>
          <CardDescription>
            This will create a critical emergency event, share location if allowed, and open your dialer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">Emergency line: {EMERGENCY_NUMBER}</p>
          <textarea
            className="min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm"
            placeholder="Describe your situation (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button variant="destructive" className="w-full" onClick={triggerEmergency} disabled={loading}>
            {loading ? "Sending..." : "Trigger Emergency Alert"}
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <a href={`tel:${EMERGENCY_NUMBER}`}>Call Emergency Line Now</a>
          </Button>
          {status && <p className="text-sm text-slate-700">{status}</p>}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
