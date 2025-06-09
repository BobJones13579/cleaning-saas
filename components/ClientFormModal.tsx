import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2 } from "lucide-react";

export type Client = {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  created_by_user_id?: string;
};

type Props = {
  client?: Client;
  onClose: () => void;
  onSave?: () => void;
};

function normalizePhone(input: string): string {
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, "");
  // If 10 digits, assume US and add +1
  if (digits.length === 10) return `+1${digits}`;
  // If 11 digits and starts with 1, add +
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  // If already starts with + and 10+ digits, return as is
  if (input.startsWith("+") && digits.length >= 10) return input;
  // Otherwise, return digits (not E.164 but at least numbers)
  return digits;
}

export default function ClientFormModal({ client, onClose, onSave }: Props) {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill form fields if editing
  useEffect(() => {
    if (client) {
      setName(client.name || "");
      setPhone(client.phone || "");
      setEmail(client.email || "");
      setAddress(client.address || "");
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
    }
    setError(null);
  }, [client]);

  const digits = phone.replace(/\D/g, "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    // Validate required fields
    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required.");
      setIsLoading(false);
      return;
    }
    // Accept common US formats, only error if clearly invalid
    if (digits.length < 7 || /[a-zA-Z]/.test(phone)) {
      setError("Please enter a valid phone number (at least 7 digits, no letters).");
      setIsLoading(false);
      return;
    }
    const normalizedPhone = normalizePhone(phone);
    try {
      if (client && client.id) {
        // Edit mode: update client
        const { error: updateError } = await supabase
          .from("clients")
          .update({
            name,
            phone: normalizedPhone,
            email: email || null,
            address: address || null,
          })
          .eq("id", client.id);
        if (updateError) throw updateError;
      } else {
        // Create mode: insert new client (no auth required)
        const { error: insertError } = await supabase
          .from("clients")
          .insert([
            {
              name,
              phone: normalizedPhone,
              email: email || null,
              address: address || null,
            },
          ]);
        if (insertError) throw insertError;
      }
      if (onSave) onSave();
      setOpen(false);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save client.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleDialogClose() {
    setOpen(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) handleDialogClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">{client ? "Edit Client" : "Add Client"}</DialogTitle>
          <DialogDescription className="text-base text-gray-600">
            {client ? "Update the client details below." : "Fill in the details to add a new client."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name" className="text-base font-semibold text-gray-800">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="client-name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Jane Doe"
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone" className="text-base font-semibold text-gray-800">Phone <span className="text-destructive">*</span></Label>
              <Input
                id="client-phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(555) 555-5555 or +1 555-555-5555"
                type="tel"
                inputMode="tel"
                required
                disabled={isLoading}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email" className="text-base font-semibold text-gray-800">Email</Label>
              <Input
                id="client-email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                placeholder="jane@example.com"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-address" className="text-base font-semibold text-gray-800">Address</Label>
              <Input
                id="client-address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="123 Main St, City, State"
                disabled={isLoading}
                autoComplete="street-address"
              />
            </div>
          </div>
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDialogClose}
              disabled={isLoading}
              className="text-base px-5 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim() || !phone.trim()}
              className="bg-blue-600 hover:bg-blue-700 focus:bg-blue-800 text-white text-base font-semibold px-5 py-2 shadow-md transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 