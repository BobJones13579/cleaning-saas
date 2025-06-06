"use client"
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useJobs } from "../lib/useJobs";
import { JOB_STATUS_OPTIONS } from "../lib/constants";
import { supabase } from "../lib/supabase";
import { Plus } from "lucide-react";
import { v4 as uuidv4, validate as validateUUID } from "uuid";
import { DateTime } from "luxon";
import { convertUTCToLocal, BUSINESS_TIMEZONE } from "../lib/utils";

export type JobFormModalJob = {
  id: string;
  client_id: string;
  cleaner_id: string;
  scheduled_start: string;
  notes: string | null;
  status: string;
};

export default function JobFormModal({
  onJobSaved,
  job,
}: {
  onJobSaved?: () => void;
  job?: JobFormModalJob;
}) {
  const [open, setOpen] = useState(!!job);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [cleaners, setCleaners] = useState<{ id: string; name: string }[]>([]);
  const [clientId, setClientId] = useState("");
  const [cleanerId, setCleanerId] = useState("");
  const [datetime, setDatetime] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState(JOB_STATUS_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { fetchClients, fetchCleaners, saveJob } = useJobs();
  const [clientsLoading, setClientsLoading] = useState(true);
  const [cleanersLoading, setCleanersLoading] = useState(true);

  // Prefill form fields if editing
  useEffect(() => {
    if (job) {
      setOpen(true);
      setClientId(job.client_id);
      setCleanerId(job.cleaner_id);
      // Convert UTC from DB to local (business time zone) for input
      setDatetime(convertUTCToLocal(job.scheduled_start));
      setNotes(job.notes || "");
      setStatus(job.status || JOB_STATUS_OPTIONS[0]);
    } else {
      setOpen(false);
      setClientId("");
      setCleanerId("");
      setDatetime("");
      setNotes("");
      setStatus(JOB_STATUS_OPTIONS[0]);
    }
  }, [job]);

  // Fetch clients and cleaners on open
  useEffect(() => {
    if (!open) return;
    (async () => {
      setClientsLoading(true);
      setClients(await fetchClients());
      setClientsLoading(false);
      setCleanersLoading(true);
      setCleaners(await fetchCleaners());
      setCleanersLoading(false);
    })();
  }, [open, fetchClients, fetchCleaners]);

  // Add this useEffect after your other useEffects
  useEffect(() => {
    if (open && !job) {
      setClientId("");
      setCleanerId("");
      setDatetime("");
      setNotes("");
      setStatus(JOB_STATUS_OPTIONS[0]);
      setError(null);
    }
  }, [open, job]);

  // Map UI status to DB status
  function mapStatusToDb(status: string) {
    switch (status) {
      case "Scheduled":
      case "In Progress":
        return "scheduled";
      case "Completed":
        return "completed";
      case "Cancelled":
        return "canceled";
      default:
        return "scheduled";
    }
  }

  // Helper function to find booked cleaners at the selected datetime
  function jobsAtDatetime(cleaners: { id: string; name: string }[], datetime: string): string[] {
    // This function would ideally query jobs for the selected datetime and return cleaner IDs
    // For MVP, we can skip this or use a placeholder (since conflict check is enforced on submit)
    return [];
  }

  const bookedCleanerIds: string[] = cleanersLoading || !datetime ? [] : jobsAtDatetime(cleaners, datetime);

  // Add this after datetime state
  const nowEastern = DateTime.now().setZone(BUSINESS_TIMEZONE);
  const isPast = datetime && DateTime.fromISO(datetime, { zone: BUSINESS_TIMEZONE }) < nowEastern;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !cleanerId || !datetime) {
      setError("Please fill all required fields.");
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    // Validate UUIDs
    if (!validateUUID(clientId) || !validateUUID(cleanerId)) {
      setError("Invalid client or cleaner selection.");
      toast({ title: "Invalid selection", description: "Please select a valid client and cleaner.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Convert local (business time zone) input to UTC for DB using Luxon
      // User enters datetime in BUSINESS_TIMEZONE (e.g. '2025-02-02T15:30'), so convert to UTC ISO string
      const utcDatetime = DateTime.fromISO(datetime, { zone: BUSINESS_TIMEZONE }).toUTC().toISO();
      // Check for cleaner conflict (same cleaner, same time)
      let query = supabase
        .from("jobs")
        .select("id, scheduled_start, cleaner_id")
        .eq("cleaner_id", cleanerId)
        .eq("scheduled_start", utcDatetime);
      if (job?.id) {
        query = query.neq("id", job.id);
      }
      const { data: conflictJobs, error: conflictError } = await query;
      if (conflictError) {
        setError(conflictError.message);
        setLoading(false);
        toast({ title: "Error", description: conflictError.message, variant: "destructive" });
        return;
      }
      if (conflictJobs && conflictJobs.length > 0) {
        setError("This cleaner is already assigned to another job at this time.");
        setLoading(false);
        toast({ title: "Conflict", description: "This cleaner is already assigned to another job at this time.", variant: "destructive" });
        return;
      }
      // Fetch the current user from Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not logged in. Please log in to edit jobs.");
        setLoading(false);
        toast({ title: "Not logged in", description: "Please log in to edit jobs.", variant: "destructive" });
        return;
      }
      const jobData = {
        client_id: clientId || null,
        cleaner_id: cleanerId || null,
        scheduled_start: utcDatetime, // Always save as UTC ISO string
        notes: notes || null,
        status: mapStatusToDb(status),
        owner_id: user.id,
      };
      const saveError = await saveJob(jobData, job?.id);
      if (saveError) {
        setError(saveError);
        toast({ title: "Error", description: saveError, variant: "destructive" });
      } else {
        toast({ title: job ? "Job updated" : "Job created", description: job ? "The job was updated." : "The job was added.", variant: "default" });
        // If job was just marked as completed, trigger feedback SMS
        if (mapStatusToDb(status) === "completed") {
          try {
            await fetch("/api/send-sms", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobId: job?.id || undefined }),
            });
          } catch (err) {
            // Optionally log error, but don't block UI
            console.error("Failed to send feedback SMS", err);
          }
        }
        setOpen(false);
        if (onJobSaved) onJobSaved();
      }
    } catch (err: any) {
      setError(err.message || "Failed to save job.");
      toast({ title: "Unexpected Error", description: err.message || String(err), variant: "destructive" });
    }
    setLoading(false);
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => {
      setError(null);
      setClientId("");
      setCleanerId("");
      setDatetime("");
      setNotes("");
      setStatus(JOB_STATUS_OPTIONS[0]);
    }, 300);
  }

  return (
    <>
      {/* Add Job Button (only when not editing) */}
      {!job && !open && (
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 focus:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-200"
          onClick={() => setOpen(true)}
          aria-label="Add Job"
          type="button"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Job</span>
        </button>
      )}
      {(open || job) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-1 sm:px-2">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-8 w-full max-w-xs sm:max-w-md mx-auto">
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight mb-4 sm:mb-6 text-gray-900">{job ? "Edit Job" : "Create New Job"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-700" htmlFor="job-client">Client<span className="text-red-500">*</span></label>
                  <select
                    id="job-client"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 shadow-sm transition text-base"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    required
                    disabled={loading || clientsLoading}
                  >
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {error && !clientId && <div className="text-red-500 text-xs mt-1">Client is required.</div>}
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700" htmlFor="job-cleaner">Cleaner<span className="text-red-500">*</span></label>
                  <select
                    id="job-cleaner"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 shadow-sm transition text-base"
                    value={cleanerId}
                    onChange={e => setCleanerId(e.target.value)}
                    required
                    disabled={loading || cleanersLoading}
                  >
                    <option value="">Select cleaner</option>
                    {cleaners.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {/* Optionally, add (Booked) if c.id is in bookedCleanerIds */}
                        {bookedCleanerIds.includes(c.id) ? ' (Booked)' : ''}
                      </option>
                    ))}
                  </select>
                  {error && !cleanerId && <div className="text-red-500 text-xs mt-1">Cleaner is required.</div>}
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700" htmlFor="job-datetime">Date & Time<span className="text-red-500">*</span></label>
                  <input
                    id="job-datetime"
                    type="datetime-local"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 shadow-sm transition text-base"
                    value={datetime}
                    onChange={e => setDatetime(e.target.value)}
                    required
                    disabled={loading}
                  />
                  {isPast && (
                    <div className="text-yellow-600 text-xs mt-1 flex items-center gap-1">
                      <span role="img" aria-label="Warning">⚠️</span>
                      This job is scheduled in the past. Reminders will not be sent automatically.
                    </div>
                  )}
                  {error && !datetime && <div className="text-red-500 text-xs mt-1">Date & Time is required.</div>}
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700" htmlFor="job-status">Status</label>
                  <select
                    id="job-status"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 shadow-sm transition text-base"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    required
                    disabled={loading}
                  >
                    {JOB_STATUS_OPTIONS.map((option: string) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700" htmlFor="job-notes">Notes (optional)</label>
                  <textarea
                    id="job-notes"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 shadow-sm transition text-base"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    disabled={loading}
                    placeholder="Any special instructions or notes..."
                  />
                </div>
              </div>
              {error && !error.includes('required') && (
                <div className="text-red-500 text-xs mt-1">{error}</div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 focus:bg-gray-200 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-200"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:bg-blue-800 shadow-md transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  disabled={loading || clientsLoading || cleanersLoading || !clientId || !cleanerId || !datetime}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 