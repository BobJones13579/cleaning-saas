"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  id: string;
  client_id: string | null;
  body: string;
  direction: "inbound" | "outbound";
  phone: string;
  sent_at?: string;
  client_name?: string | null;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<{ [id: string]: string }>({});
  const [sending, setSending] = useState<{ [id: string]: boolean }>({});
  const { toast } = useToast();
  const [filter, setFilter] = useState("");

  async function fetchMessages() {
    setLoading(true);
    setError(null);
    // Join with clients to get client name
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

  async function handleReply(message: Message) {
    if (!reply[message.id]?.trim()) return;
    setSending((s) => ({ ...s, [message.id]: true }));
    // Compliance: Only send if Twilio is live
    if (process.env.NEXT_PUBLIC_TWILIO_LIVE !== "true") {
      toast({
        title: "SMS sending is disabled",
        description: "Twilio compliance not cleared. Message not sent.",
        variant: "destructive",
      });
      setSending((s) => ({ ...s, [message.id]: false }));
      return;
    }
    try {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: message.phone, message: reply[message.id] }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: "Reply sent", description: "SMS sent to client." });
        setReply((r) => ({ ...r, [message.id]: "" }));
        fetchMessages();
      } else {
        toast({ title: "Failed to send", description: result.error || "Could not send SMS.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Unexpected Error", description: err.message || String(err), variant: "destructive" });
    }
    setSending((s) => ({ ...s, [message.id]: false }));
  }

  // Optional: filter by client name, phone, or body
  const filteredMessages = messages.filter((msg) => {
    if (!filter.trim()) return true;
    const f = filter.toLowerCase();
    return (
      (msg.client_name || "").toLowerCase().includes(f) ||
      (msg.phone || "").toLowerCase().includes(f) ||
      (msg.body || "").toLowerCase().includes(f)
    );
  });

  return (
    <main className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-900 font-semibold flex items-center gap-2">
        <span role="img" aria-label="warning">⚠️</span>
        SMS sending is disabled until Twilio compliance is cleared.
      </div>
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      <div className="mb-4 flex gap-2 items-center">
        <Input
          placeholder="Filter by client, phone, or message..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
      </div>
      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading messages...</div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">Error: {error}</div>
      ) : filteredMessages.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No messages found.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Body</TableHead>
              <TableHead>Sent At</TableHead>
              <TableHead>Reply</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMessages.map((msg) => (
              <TableRow key={msg.id}>
                <TableCell>{msg.client_name || <span className="text-gray-400">Unknown</span>}</TableCell>
                <TableCell>{msg.phone}</TableCell>
                <TableCell>
                  <span className={msg.direction === "inbound" ? "text-blue-700 font-semibold" : "text-green-700 font-semibold"}>
                    {msg.direction}
                  </span>
                </TableCell>
                <TableCell>{msg.body}</TableCell>
                <TableCell>{msg.sent_at ? new Date(msg.sent_at).toLocaleString() : ""}</TableCell>
                <TableCell>
                  {msg.direction === "inbound" ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Type reply..."
                        value={reply[msg.id] || ""}
                        onChange={(e) => setReply((r) => ({ ...r, [msg.id]: e.target.value }))}
                        className="w-32"
                        disabled={sending[msg.id] || process.env.NEXT_PUBLIC_TWILIO_LIVE !== "true"}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleReply(msg)}
                        disabled={sending[msg.id] || !reply[msg.id]?.trim() || process.env.NEXT_PUBLIC_TWILIO_LIVE !== "true"}
                      >
                        Reply
                      </Button>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
} 