"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Send, Loader2 } from "lucide-react";

interface Message {
  id: string;
  client_id: string | null;
  body: string;
  direction: "inbound" | "outbound" | "system";
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

  // Enhanced: Group messages by sender and time (5+ min gap)
  function groupMessagesBySenderAndTime(msgs: Message[]) {
    if (!msgs || msgs.length === 0) return [];
    const groups: {
      sender: 'inbound' | 'outbound' | 'system',
      messages: Message[],
      timestamp: string
    }[] = [];
    let currentGroup = {
      sender: msgs[0].direction,
      messages: [msgs[0]],
      timestamp: msgs[0].sent_at || ""
    };
    for (let i = 1; i < msgs.length; i++) {
      const msg = msgs[i];
      const prevMsg = msgs[i - 1];
      const senderChanged = msg.direction !== currentGroup.sender;
      const timeGap = prevMsg.sent_at && msg.sent_at
        ? (new Date(msg.sent_at).getTime() - new Date(prevMsg.sent_at).getTime()) / 1000 / 60
        : 0;
      if (senderChanged || timeGap > 5) {
        groups.push(currentGroup);
        currentGroup = {
          sender: msg.direction,
          messages: [msg],
          timestamp: msg.sent_at || ""
        };
      } else {
        currentGroup.messages.push(msg);
      }
    }
    groups.push(currentGroup);
    return groups;
  }

  const groupedConversation = conversation ? groupMessagesBySenderAndTime(conversation) : [];

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

  useEffect(() => {
    // Subscribe to real-time changes in the messages table
    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          // Fetch client name if client_id exists and not already in state
          let client_name = null;
          if (payload.new.client_id) {
            // Try to find in current messages
            const existing = messages.find(m => m.client_id === payload.new.client_id && m.client_name);
            if (existing) {
              client_name = existing.client_name;
            } else {
              // Fetch from Supabase
              const { data } = await supabase
                .from('clients')
                .select('name')
                .eq('id', payload.new.client_id)
                .single();
              client_name = data?.name || null;
            }
          }
          // Ensure all Message fields are present
          const newMsg: Message = {
            id: payload.new.id,
            client_id: payload.new.client_id ?? null,
            body: payload.new.body ?? '',
            direction: payload.new.direction,
            phone: payload.new.phone ?? '',
            sent_at: payload.new.sent_at,
            client_name,
            is_read: payload.new.is_read ?? false,
          };

          setMessages(prev => {
            // Remove optimistic message if present
            const optimisticIdx = prev.findIndex(m =>
              typeof m.id === 'string' && m.id.startsWith('temp-') &&
              m.body === newMsg.body &&
              m.phone === newMsg.phone &&
              m.direction === newMsg.direction
            );
            if (optimisticIdx !== -1) {
              const updated = [...prev];
              updated[optimisticIdx] = newMsg;
              return updated;
            }
            // Otherwise, add if not already present
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
        if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        }
        if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
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
        body: JSON.stringify({ to: phone, body: newMsg.body }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: "Reply sent", description: "SMS sent to client." });
        // No need to call fetchMessages here; real-time will update
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
            className="mb-3 pl-10"
            aria-label="Search messages"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Search className="h-5 w-5" />
          </span>
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
                    className={`relative flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors duration-150 ${selectedThread === threadKey ? "bg-blue-100 ring-2 ring-blue-300" : "hover:bg-gray-50 active:bg-blue-50"}`}
                    onClick={() => setSelectedThread(threadKey)}
                    aria-label={`Open thread with ${msg.client_name || msg.phone}`}
                    tabIndex={0}
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
                          <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500 text-white" title="Unread messages">{unreadCount}</span>
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
                  aria-label="Back to threads"
                  tabIndex={0}
                  title="Back to threads"
                >
                  Back to threads
                </button>
              </div>
              <div className="flex flex-col gap-3 bg-white border rounded-xl shadow-md p-4 max-h-[60vh] overflow-y-auto bg-blue-50/30">
                {groupedConversation.map((group, groupIdx) => (
                  <div key={groupIdx} className="w-full">
                    {/* Timestamp above group */}
                    <div className="w-full flex justify-center my-2">
                      <span className="text-xs text-gray-400 text-center">
                        {group.timestamp ? new Date(group.timestamp).toLocaleString() : ""}
                      </span>
                    </div>
                    <div className={`flex flex-col ${groupIdx > 0 ? 'mt-4' : ''}`}> {/* More space between groups */}
                      {group.messages.map((msg, idx) => {
                        const isInbound = msg.direction === "inbound";
                        const isOutbound = msg.direction === "outbound";
                        const isSystem = msg.direction === "system";
                        const showAvatar = idx === 0 && !isSystem;
                        const isFirst = idx === 0;
                        const isLast = idx === group.messages.length - 1;
                        const isSolo = group.messages.length === 1;
                        // Bubble corner logic
                        let bubbleClass = "";
                        if (isSolo) {
                          bubbleClass = "rounded-2xl";
                        } else if (isFirst) {
                          bubbleClass = isInbound
                            ? "rounded-t-2xl rounded-br-2xl rounded-bl-2xl"
                            : "rounded-t-2xl rounded-bl-2xl rounded-br-2xl";
                        } else if (isLast) {
                          bubbleClass = isInbound
                            ? "rounded-b-2xl rounded-tr-2xl rounded-bl-2xl"
                            : "rounded-b-2xl rounded-tl-2xl rounded-br-2xl";
                        } else {
                          bubbleClass = isInbound
                            ? "rounded-bl-2xl rounded-br-2xl"
                            : "rounded-bl-2xl rounded-br-2xl";
                        }
                        // Spacing
                        const msgSpacing = idx === 0 ? '' : 'mt-1';
                        // System/auto message styling
                        if (isSystem) {
                          return (
                            <div key={msg.id} className="flex justify-center my-2">
                              <span className="text-xs italic text-gray-400 bg-transparent px-2 py-1">
                                {msg.body}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={msg.id}
                            className={`flex items-end gap-3 transition-all duration-300 ease-in-out ${isInbound ? "flex-row" : "flex-row-reverse"} ${msgSpacing}`}
                            style={{ opacity: 1, transform: 'translateY(0)' }}
                          >
                            {showAvatar ? (
                              <Avatar>
                                <AvatarFallback className={isInbound ? "bg-blue-100 text-blue-700 font-bold" : "bg-green-100 text-green-700 font-bold"}>
                                  {isInbound
                                    ? (msg.client_name ? msg.client_name.split(" ").map((n) => n[0]).join("") : msg.phone.slice(-4))
                                    : "Y"}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="w-10" />
                            )}
                            <div className={`flex flex-col max-w-[75%] ${isInbound ? "items-start" : "items-end"}`}>
                              <div
                                className={`px-4 py-2 text-base shadow-sm transition-colors duration-150 ${
                                  isInbound
                                    ? "bg-blue-50 text-gray-900 border border-blue-100"
                                    : "bg-green-50 text-gray-900 border border-green-100"
                                } animate-fade-in ${bubbleClass}`}
                                style={{
                                  marginTop: isFirst ? 0 : 4,
                                  marginBottom: isLast ? 0 : 4,
                                  minWidth: '2.5rem',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {msg.body}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div ref={conversationEndRef} />
              </div>
              {/* Redesigned Reply bar: modern pill-style input with send icon inside */}
              <form
                className="w-full flex justify-center items-end pb-4"
                onSubmit={e => {
                  e.preventDefault();
                  const lastMsg = conversation[conversation.length - 1];
                  if (lastMsg && reply[selectedThread]?.trim()) handleReply(selectedThread, lastMsg.phone);
                }}
                aria-label="Reply to client"
                autoComplete="off"
              >
                <div
                  className="flex items-end w-full max-w-2xl bg-[#F1F1F1] border border-gray-200 shadow-sm rounded-full px-3 py-2 relative"
                  style={{ minHeight: 48 }}
                >
                  <textarea
                    rows={1}
                    maxLength={1000}
                    value={reply[selectedThread] || ""}
                    onChange={e => setReply(r => ({ ...r, [selectedThread]: e.target.value }))}
                    placeholder="Type a message..."
                    className="flex-1 resize-none bg-transparent outline-none border-none text-base pl-3 pr-10 py-2 rounded-full focus:ring-0 focus:outline-none min-h-[32px] max-h-[96px]"
                    style={{
                      overflow: 'auto',
                      minHeight: 32,
                      maxHeight: 96,
                    }}
                    disabled={sending[selectedThread]}
                    aria-label="Type your reply"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const lastMsg = conversation[conversation.length - 1];
                        if (lastMsg && reply[selectedThread]?.trim()) handleReply(selectedThread, lastMsg.phone);
                      }
                    }}
                  />
                  {/* Send icon inside input bar */}
                  <button
                    type="submit"
                    disabled={sending[selectedThread] || !reply[selectedThread]?.trim()}
                    tabIndex={0}
                    aria-label="Send reply"
                    className={`absolute right-3 bottom-2 flex items-center justify-center rounded-full transition-all duration-150
                      ${reply[selectedThread]?.trim() && !sending[selectedThread] ? 'bg-blue-600 hover:bg-blue-700 text-white scale-110 shadow-md' : 'bg-gray-200 text-gray-400 cursor-default'}
                      h-9 w-9 p-0 m-0 focus:outline-none`}
                    style={{ pointerEvents: sending[selectedThread] || !reply[selectedThread]?.trim() ? 'none' : 'auto' }}
                  >
                    <Send className={`h-5 w-5 transition-transform duration-150 ${reply[selectedThread]?.trim() && !sending[selectedThread] ? 'scale-110' : ''}`} />
                  </button>
                </div>
              </form>
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