"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  id: string;
  client_id: string | null;
  body: string;
  direction: "inbound" | "outbound";
  phone: string;
  sent_at?: string;
  client_name?: string | null;
  is_read: boolean;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<{ [threadKey: string]: string }>({});
  const [sending, setSending] = useState<{ [threadKey: string]: boolean }>({});
  const { toast } = useToast();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Helper: get thread key (client_id or phone)
  function getThreadKey(msg: Message) {
    return msg.client_id || msg.phone;
  }

  // Debounce search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearchDebounced(search), 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search]);

  // Scroll to bottom of conversation on update
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedThread, messages]);

  // Mark all inbound messages in thread as read when opened
  useEffect(() => {
    if (!selectedThread) return;
    const unreadInbound = threads[selectedThread]?.filter(
      (msg) => msg.direction === "inbound" && msg.is_read === false
    );
    if (unreadInbound && unreadInbound.length > 0) {
      const ids = unreadInbound.map((msg) => msg.id);
      supabase
        .from("messages")
        .update({ is_read: true })
        .in("id", ids)
        .then(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              ids.includes(msg.id) ? { ...msg, is_read: true } : msg
            )
          );
        });
    }
  }, [selectedThread]);

  // Group messages into threads (add unread count)
  function groupMessages(msgs: Message[]) {
    const threads: { [threadKey: string]: Message[] } = {};
    msgs.forEach((msg) => {
      const key = getThreadKey(msg);
      if (!threads[key]) threads[key] = [];
      threads[key].push(msg);
    });
    return threads;
  }

  // Get latest message per thread
  function getLatestMessages(threads: { [threadKey: string]: Message[] }) {
    return Object.entries(threads)
      .map(([key, msgs]) => msgs.slice().sort((a, b) => (b.sent_at && a.sent_at ? new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime() : 0))[0])
      .sort((a, b) => (b.sent_at && a.sent_at ? new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime() : 0));
  }

  // Filter threads by search
  const threads = groupMessages(messages);
  let latestMessages = getLatestMessages(threads);
  if (searchDebounced.trim()) {
    const f = searchDebounced.toLowerCase();
    latestMessages = latestMessages.filter((msg) =>
      (msg.client_name || "").toLowerCase().includes(f) ||
      (msg.phone || "").toLowerCase().includes(f) ||
      (msg.body || "").toLowerCase().includes(f)
    );
  }

  // Conversation view: all messages in selected thread, sorted oldest to newest
  const conversation = selectedThread
    ? threads[selectedThread]?.slice().sort((a, b) =>
        a.sent_at && b.sent_at ? new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime() : 0
      )
    : null;

  // Count unread inbound messages per thread
  function getUnreadCount(threadMsgs: Message[]) {
    return threadMsgs.filter((msg) => msg.direction === "inbound" && msg.is_read === false).length;
  }

  async function fetchMessages() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("messages")
      .select("id, client_id, body, direction, phone, sent_at, clients:client_id(name)")
      .order("sent_at", { ascending: false })
      .limit(100);
    if (error) {
      setError(error.message);
      setMessages([]);
    } else {
      setMessages(
        (data || []).map((msg: any) => ({
          ...msg,
          client_name: msg.clients?.name || null,
        }))
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchMessages();
  }, []);

  async function handleReply(threadKey: string, phone: string) {
    if (!reply[threadKey]?.trim()) return;
    setSending((s) => ({ ...s, [threadKey]: true }));
    const newMsg: Message = {
      id: `temp-${Date.now()}`,
      client_id: threads[threadKey]?.[0]?.client_id || null,
      body: reply[threadKey],
      direction: "outbound",
      phone,
      sent_at: new Date().toISOString(),
      client_name: threads[threadKey]?.[0]?.client_name || null,
      is_read: true,
    };
    setMessages((prev) => [...prev, newMsg]); // Optimistic update
    setReply((r) => ({ ...r, [threadKey]: "" }));
    try {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, message: newMsg.body }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: "Reply sent", description: "SMS sent to client." });
        fetchMessages();
      } else {
        toast({ title: "Failed to send", description: result.error || "Could not send SMS.", variant: "destructive" });
        // Remove optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== newMsg.id));
      }
    } catch (err: any) {
      toast({ title: "Unexpected Error", description: err.message || String(err), variant: "destructive" });
      setMessages((prev) => prev.filter((m) => m.id !== newMsg.id));
    }
    setSending((s) => ({ ...s, [threadKey]: false }));
  }

  return (
    <main className="max-w-4xl mx-auto py-8 px-2 md:px-4">
      <h1 className="text-3xl font-bold mb-6 tracking-tight text-gray-900">Messages</h1>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Thread List */}
        <div className="w-full md:w-1/2 max-w-md">
          <div className="mb-3 text-lg font-semibold text-gray-800">Threads</div>
          <Input
            placeholder="Search by client, phone, or message..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-3"
          />
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading messages...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">Error: {error}</div>
          ) : latestMessages.length === 0 ? (
            <div className="text-center text-gray-300 py-8">No messages found.</div>
          ) : (
            <ul className="divide-y divide-gray-100 border rounded-xl bg-white shadow-sm overflow-hidden">
              {latestMessages.map((msg) => {
                const threadKey = getThreadKey(msg);
                const unreadCount = getUnreadCount(threads[threadKey] || []);
                return (
                  <li
                    key={threadKey}
                    className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors duration-150 ${selectedThread === threadKey ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    onClick={() => setSelectedThread(threadKey)}
                  >
                    <Avatar>
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                        {msg.client_name
                          ? msg.client_name.split(" ").map((n) => n[0]).join("")
                          : msg.phone.slice(-4)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate text-gray-900 flex items-center gap-2">
                        {msg.client_name || <span className="text-gray-400">Unknown</span>}
                        {unreadCount > 0 && (
                          <span className="ml-1 inline-block w-2 h-2 rounded-full bg-blue-500" title="Unread messages"></span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{msg.phone}</div>
                      <div className="text-sm truncate text-gray-700 mt-1 font-normal">{msg.body}</div>
                    </div>
                    <div className="flex flex-col items-end ml-2">
                      <span className={
                        msg.direction === "inbound"
                          ? "text-blue-600 font-semibold text-xs"
                          : "text-green-600 font-semibold text-xs"
                      }>
                        {msg.direction === "inbound" ? "Client" : "You"}
                      </span>
                      <span className="text-[11px] text-gray-300 mt-1 font-medium">
                        {msg.sent_at ? new Date(msg.sent_at).toLocaleString() : ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {/* Conversation View */}
        <div className="flex-1 min-w-0 flex flex-col">
          {selectedThread && conversation ? (
            <div className="flex flex-col h-full">
              <div className="mb-3 text-lg font-semibold flex items-center gap-2 text-gray-800">
                Conversation
                <button
                  className="ml-auto text-xs text-blue-600 hover:underline focus:outline-none"
                  onClick={() => setSelectedThread(null)}
                >
                  Back to threads
                </button>
              </div>
              <div className="flex flex-col gap-3 bg-white border rounded-xl shadow-md p-4 max-h-[60vh] overflow-y-auto">
                {conversation.map((msg, idx) => {
                  const isInbound = msg.direction === "inbound";
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-3 ${isInbound ? "flex-row" : "flex-row-reverse"}`}
                    >
                      <Avatar>
                        <AvatarFallback className={isInbound ? "bg-blue-100 text-blue-700 font-bold" : "bg-green-100 text-green-700 font-bold"}>
                          {isInbound
                            ? (msg.client_name ? msg.client_name.split(" ").map((n) => n[0]).join("") : msg.phone.slice(-4))
                            : "Y"}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex flex-col max-w-[75%] ${isInbound ? "items-start" : "items-end"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={isInbound ? "text-blue-700 font-semibold text-xs" : "text-green-700 font-semibold text-xs"}>
                            {isInbound ? "Client" : "You"}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {msg.sent_at ? new Date(msg.sent_at).toLocaleString() : ""}
                          </span>
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-2 text-base shadow-sm transition-colors duration-150 ${
                            isInbound
                              ? "bg-blue-50 text-gray-900 border border-blue-100"
                              : "bg-green-50 text-gray-900 border border-green-100"
                          }`}
                        >
                          {msg.body}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={conversationEndRef} />
              </div>
              {/* Reply box for latest message in thread, only if last message is inbound */}
              {(() => {
                const lastMsg = conversation[conversation.length - 1];
                if (lastMsg && lastMsg.direction === "inbound") {
                  return (
                    <form
                      className="flex gap-2 mt-6"
                      onSubmit={e => {
                        e.preventDefault();
                        handleReply(selectedThread, lastMsg.phone);
                      }}
                    >
                      <Input
                        placeholder="Type reply..."
                        value={reply[selectedThread] || ""}
                        onChange={e => setReply(r => ({ ...r, [selectedThread]: e.target.value }))}
                        className="flex-1 h-12 text-base px-4 border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl shadow-sm"
                        disabled={sending[selectedThread]}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="h-12 px-6 rounded-xl text-base font-semibold bg-blue-600 hover:bg-blue-700 transition-colors duration-150"
                        disabled={sending[selectedThread] || !reply[selectedThread]?.trim()}
                      >
                        Reply
                      </Button>
                    </form>
                  );
                }
                return null;
              })()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center text-gray-300 py-8">
              <span className="text-5xl mb-2">💬</span>
              <span className="text-lg font-medium">Select a thread to view conversation.</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 