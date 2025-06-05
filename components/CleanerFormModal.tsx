import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { isValidPhone } from "../lib/utils";

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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("active");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill form fields if editing
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
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || /[a-zA-Z]/.test(phone)) {
      setError("Please enter a valid phone number (at least 7 digits, no letters).");
      setIsLoading(false);
      return;
    }
    const normalizedPhone = normalizePhone(phone);
    try {
      if (cleaner && cleaner.id) {
        // Edit mode: update cleaner
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
        // Create mode: insert new cleaner (no auth required)
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
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save cleaner.");
    } finally {
      setIsLoading(false);
    }
  }

  const digits = phone.replace(/\D/g, "");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-1 sm:px-2">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 w-full max-w-xs sm:max-w-md p-4 sm:p-8 relative mx-auto">
        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight mb-4 sm:mb-6 text-gray-900">
          {cleaner ? "Edit Cleaner" : "Add Cleaner"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="space-y-3">
            <div>
              <label className="block font-semibold mb-1 text-gray-700" htmlFor="cleaner-name">Full Name<span className="text-red-500">*</span></label>
              <input
                id="cleaner-name"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 shadow-sm transition placeholder-gray-400 text-base"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Jane Doe"
                autoComplete="name"
              />
              {error && !name.trim() && <div className="text-red-500 text-xs mt-1">Name is required.</div>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-gray-700" htmlFor="cleaner-phone">Phone<span className="text-red-500">*</span></label>
              <input
                id="cleaner-phone"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 shadow-sm transition placeholder-gray-400 text-base"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(555) 555-5555 or +1 555-555-5555"
                type="tel"
                inputMode="tel"
                required
                disabled={isLoading}
                autoComplete="tel"
              />
              {error && (digits.length < 7 || /[a-zA-Z]/.test(phone)) && <div className="text-red-500 text-xs mt-1">Please enter a valid phone number.</div>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-gray-700" htmlFor="cleaner-status">Status</label>
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
          {error && !error.includes('Name') && !error.includes('phone') && (
            <div className="text-red-500 text-xs mt-1">{error}</div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 focus:bg-gray-200 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-200"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:bg-blue-800 shadow-md transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
              disabled={isLoading || !name.trim() || !phone.trim()}
            >
              {isLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 