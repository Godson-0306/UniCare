"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Loader2, MessageCircle, Send } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotificationsSocket } from "@/hooks/use-notifications-socket";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { cn } from "@/lib/utils";
import type { ApiResponse } from "@/types/api";

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

interface ChatStudent {
  id: string;
  full_name: string;
  matric_number: string;
  department: string;
  faculty: string;
  level: string;
}

interface ChatThread {
  student: ChatStudent;
  latest_message: ChatMessage | null;
  unread_count: number;
  last_message_at: string;
}

interface SocketPayload {
  event?: string;
  data?: ChatMessage;
}

export default function ReceptionChatPage() {
  const queryClient = useQueryClient();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  const threadsQuery = useQuery({
    queryKey: ["reception", "chat", "threads"],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<ChatThread[]>>("/reception/chat/threads/");
      if (!response.data.success) {
        throw new Error(response.data.error.message);
      }
      return response.data.data;
    },
  });

  const threads = useMemo(() => threadsQuery.data ?? [], [threadsQuery.data]);
  const selectedThread = useMemo(
    () => threads.find((thread) => thread.student.id === selectedStudentId) ?? threads[0] ?? null,
    [selectedStudentId, threads]
  );

  const messagesQuery = useQuery({
    queryKey: ["reception", "chat", "messages", selectedThread?.student.id],
    enabled: Boolean(selectedThread?.student.id),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<ChatMessage[]>>(
        `/reception/chat/threads/${selectedThread?.student.id}/messages/`
      );
      if (!response.data.success) {
        throw new Error(response.data.error.message);
      }
      return response.data.data;
    },
  });

  const markRead = useMutation({
    mutationFn: async (studentId: string) => {
      const response = await apiClient.post<ApiResponse<{ updated: number }>>(`/reception/chat/threads/${studentId}/read/`);
      if (!response.data.success) {
        throw new Error(response.data.error.message);
      }
      return response.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reception", "chat", "threads"] });
    },
  });

  useEffect(() => {
    if (selectedThread && selectedThread.unread_count > 0 && !markRead.isPending) {
      markRead.mutate(selectedThread.student.id);
    }
  }, [markRead, selectedThread]);

  const sendReply = useMutation({
    mutationFn: async ({ studentId, content }: { studentId: string; content: string }) => {
      const response = await apiClient.post<ApiResponse<ChatMessage>>(`/reception/chat/threads/${studentId}/reply/`, { content });
      if (!response.data.success) {
        throw new Error(response.data.error.message);
      }
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      setReply("");
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["reception", "chat", "threads"] });
      void queryClient.invalidateQueries({ queryKey: ["reception", "chat", "messages", variables.studentId] });
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, "Unable to send reply."));
    },
  });

  const handleSocketMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as SocketPayload;
        if (payload.event !== "chat.message_created" || !payload.data?.id || !payload.data.student_id) return;
        const incomingMessage = payload.data;
        queryClient.setQueryData<ChatMessage[]>(["reception", "chat", "messages", incomingMessage.student_id], (current = []) => {
          if (current.some((item) => item.id === incomingMessage.id)) return current;
          return [...current, incomingMessage];
        });
        void queryClient.invalidateQueries({ queryKey: ["reception", "chat", "threads"] });
      } catch {
        /* ignore malformed realtime payloads */
      }
    },
    [queryClient]
  );

  useNotificationsSocket({ onMessage: handleSocketMessage });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = reply.trim();
    if (!trimmed || !selectedThread || sendReply.isPending) return;
    sendReply.mutate({ studentId: selectedThread.student.id, content: trimmed });
  }

  const messages = messagesQuery.data ?? [];

  return (
    <DashboardShell title="Reception Chat" subtitle="Shared patient inbox" navItems={HOSPITAL_NAV.receptionist}>
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-teal-600" />
              Threads
            </CardTitle>
            <CardDescription>Patient messages routed to reception.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {threadsQuery.isLoading && <p className="text-sm text-slate-500">Loading threads...</p>}
            {threadsQuery.isError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {getApiErrorMessage(threadsQuery.error, "Unable to load chat threads.")}
              </p>
            )}
            {!threadsQuery.isLoading && threads.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                No patient messages yet.
              </div>
            )}
            {threads.map((thread) => {
              const active = selectedThread?.student.id === thread.student.id;
              return (
                <button
                  key={thread.student.id}
                  type="button"
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    active ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  )}
                  onClick={() => {
                    setSelectedStudentId(thread.student.id);
                    setError("");
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{thread.student.full_name}</p>
                      <p className="text-xs text-slate-500">{thread.student.matric_number}</p>
                    </div>
                    {thread.unread_count > 0 && (
                      <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs font-medium text-white">{thread.unread_count}</span>
                    )}
                  </div>
                  {thread.latest_message && <p className="mt-2 line-clamp-2 text-xs text-slate-600">{thread.latest_message.content}</p>}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-teal-600" />
              {selectedThread ? selectedThread.student.full_name : "Conversation"}
            </CardTitle>
            <CardDescription>
              {selectedThread
                ? `${selectedThread.student.matric_number} | ${selectedThread.student.department || "No department listed"}`
                : "Select a thread to reply."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex min-h-[28rem] flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              {messagesQuery.isLoading && <p className="text-sm text-slate-500">Loading messages...</p>}
              {messagesQuery.isError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {getApiErrorMessage(messagesQuery.error, "Unable to load messages.")}
                </p>
              )}
              {!messagesQuery.isLoading && selectedThread && messages.length === 0 && (
                <div className="flex flex-1 items-center justify-center text-center text-sm text-slate-500">No messages in this thread.</div>
              )}
              {!selectedThread && (
                <div className="flex flex-1 items-center justify-center text-center text-sm text-slate-500">
                  Patient conversations will appear here.
                </div>
              )}
              {messages.map((item) => {
                const isStaff = item.sender_role !== "student";
                return (
                  <div key={item.id} className={cn("flex", isStaff ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm",
                        isStaff ? "bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-800"
                      )}
                    >
                      <p>{item.content}</p>
                      <p className={cn("mt-1 text-xs", isStaff ? "text-teal-50" : "text-slate-500")}>
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
                placeholder="Reply to patient"
                value={reply}
                onChange={(event) => {
                  setReply(event.target.value);
                  setError("");
                }}
                disabled={!selectedThread || sendReply.isPending}
              />
              <Button type="submit" className="sm:self-end" disabled={!selectedThread || !reply.trim() || sendReply.isPending}>
                {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Reply
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
