import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2 } from "lucide-react";

export type Cleaner = {
  id?: string;
  name: string;
  phone: string;
  status?: string;
  notes?: string;
  owner_id?: string;
};

type Props = {
  cleaner?: Cleaner;
  onClose: () => void;
  onSave?: () => void;
};

export default function CleanerFormModal({ cleaner, onClose, onSave }: Props) {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("active");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cleaner) {
      setName(cleaner.name || "");
      setPhone(cleaner.phone || "");
      setStatus(cleaner.status || "active");
    } else {
      setName("");
      setPhone("");
      setStatus("active");
    }
    setError(null);
  }, [cleaner]);

  function normalizePhone(input: string): string {
    const digits = input.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    if (input.startsWith("+") && digits.length >= 10) return input;
    return digits;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required.");
      setIsLoading(false);
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || /[a-zA-Z]/.test(phone)) {
      setError("Please enter a valid phone number (at least 7 digits, no letters).");
      setIsLoading(false);
      return;
    }
    const normalizedPhone = normalizePhone(phone);
    try {
      if (cleaner && cleaner.id) {
        const { error: updateError } = await supabase
          .from("cleaners")
          .update({
            name,
            phone: normalizedPhone,
            status,
          })
          .eq("id", cleaner.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("cleaners")
          .insert([
            {
              name,
              phone: normalizedPhone,
              status,
            },
          ]);
        if (insertError) throw insertError;
      }
      if (onSave) onSave();
      setOpen(false);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save cleaner.");
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
          <DialogTitle className="text-2xl font-bold text-gray-900">{cleaner ? "Edit Cleaner" : "Add Cleaner"}</DialogTitle>
          <DialogDescription className="text-base text-gray-600">
            {cleaner ? "Update the cleaner details below." : "Fill in the details to add a new cleaner."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cleaner-name" className="text-base font-semibold text-gray-800">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="cleaner-name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Jane Doe"
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cleaner-phone" className="text-base font-semibold text-gray-800">Phone <span className="text-destructive">*</span></Label>
              <Input
                id="cleaner-phone"
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
              <Label htmlFor="cleaner-status" className="text-base font-semibold text-gray-800">Status</Label>
              <select
                id="cleaner-status"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 shadow-sm transition text-base"
                value={status}
                onChange={e => setStatus(e.target.value)}
                disabled={isLoading}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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