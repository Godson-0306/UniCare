"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { FormEvent, useCallback, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotificationsSocket } from "@/hooks/use-notifications-socket";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { STUDENT_NAV } from "@/lib/student/nav-config";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { ApiResponse } from "@/types/api";

const CONTACT_PHONE = process.env.NEXT_PUBLIC_HEALTH_CENTER_PHONE ?? "+2348000000000";
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_HEALTH_CENTER_EMAIL ?? "healthcenter@example.edu";
const CONTACT_LOCATION = process.env.NEXT_PUBLIC_HEALTH_CENTER_LOCATION ?? "University Health Centre";

interface ChatMessage {
  id: string;
  student_id: string;
  student_name: string;
  sender_id: string | null;
  sender_role: string | null;
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface SocketPayload {
  event?: string;
  data?: ChatMessage;
}

export default function StudentContactPage() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const chatQuery = useQuery({
    queryKey: ["student", "chat"],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<ChatMessage[]>>("/student/chat/messages/");
      if (!response.data.success) {
        throw new Error(response.data.error.message);
      }
      return response.data.data;
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiClient.post<ApiResponse<ChatMessage>>("/student/chat/messages/", { content });
      if (!response.data.success) {
        throw new Error(response.data.error.message);
      }
      return response.data.data;
    },
    onSuccess: () => {
      setMessage("");
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["student", "chat"] });
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, "Unable to send your message."));
    },
  });

  const handleSocketMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as SocketPayload;
        if (payload.event !== "chat.message_created" || !payload.data?.id) return;
        const incomingMessage = payload.data;
        queryClient.setQueryData<ChatMessage[]>(["student", "chat"], (current = []) => {
          if (current.some((item) => item.id === incomingMessage.id)) return current;
          return [...current, incomingMessage];
        });
      } catch {
        /* ignore malformed realtime payloads */
      }
    },
    [queryClient]
  );

  useNotificationsSocket({ enabled: Boolean(userId), onMessage: handleSocketMessage });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || sendMessage.isPending) return;
    sendMessage.mutate(trimmed);
  }

  const messages = chatQuery.data ?? [];

  return (
    <DashboardShell title="Contact Centre" navItems={STUDENT_NAV}>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-teal-600" />
              Chat with Reception
            </CardTitle>
            <CardDescription>Message reception about appointments, records, prescriptions, or lab-result questions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {chatQuery.isLoading && <p className="text-sm text-slate-500">Loading conversation...</p>}
            {chatQuery.isError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {getApiErrorMessage(chatQuery.error, "Unable to load messages.")}
              </p>
            )}
            <div className="flex min-h-[22rem] flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              {!chatQuery.isLoading && messages.length === 0 && (
                <div className="flex flex-1 items-center justify-center text-center text-sm text-slate-500">
                  No messages yet. Send a note and reception will pick it up.
                </div>
              )}
              {messages.map((item) => {
                const isStudent = item.sender_role === "student";
                return (
                  <div key={item.id} className={cn("flex", isStudent ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm",
                        isStudent ? "bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-800"
                      )}
                    >
                      <p>{item.content}</p>
                      <p className={cn("mt-1 text-xs", isStudent ? "text-teal-50" : "text-slate-500")}>
                        {item.sender_name} | {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
              <textarea
                className="min-h-24 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Type your message to reception"
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setError("");
                }}
                disabled={sendMessage.isPending}
              />
              <Button type="submit" className="sm:self-end" disabled={!message.trim() || sendMessage.isPending}>
                {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Other Support</CardTitle>
              <CardDescription>Use these options when chat is unavailable.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <a className="block rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50" href={`tel:${CONTACT_PHONE}`}>
                <Phone className="h-5 w-5 text-teal-600" />
                <p className="mt-3 text-sm font-medium text-slate-900">Call the centre</p>
                <p className="mt-1 text-sm text-slate-600">{CONTACT_PHONE}</p>
              </a>
              <a className="block rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50" href={`mailto:${CONTACT_EMAIL}`}>
                <Mail className="h-5 w-5 text-teal-600" />
                <p className="mt-3 text-sm font-medium text-slate-900">Email support</p>
                <p className="mt-1 text-sm text-slate-600">{CONTACT_EMAIL}</p>
              </a>
              <div className="rounded-lg border border-slate-200 p-4">
                <MapPin className="h-5 w-5 text-teal-600" />
                <p className="mt-3 text-sm font-medium text-slate-900">Visit us</p>
                <p className="mt-1 text-sm text-slate-600">{CONTACT_LOCATION}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">Urgent help</CardTitle>
              <CardDescription className="text-red-700">Use emergency assistance for urgent medical situations.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full" asChild>
                <a href="/student/emergency">Request Emergency Help</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
