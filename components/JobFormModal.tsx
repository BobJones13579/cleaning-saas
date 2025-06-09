"use client"
import { useState, useEffect, ReactNode } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useJobs } from "../lib/useJobs";
import { JOB_STATUS_OPTIONS } from "../lib/constants";
import { supabase } from "../lib/supabase";
import { Plus, Calendar, User, Users, Clock, AlertCircle, Loader2 } from "lucide-react";
import { v4 as uuidv4, validate as validateUUID } from "uuid";
import { DateTime } from "luxon";
import { convertUTCToLocal, BUSINESS_TIMEZONE } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type JobFormModalJob = {
  id: string;
  client_id: string;
  cleaner_id: string;
  scheduled_start: string;
  notes: string | null;
  status: string;
};

interface JobFormModalProps {
  onJobSaved?: () => void;
  job?: JobFormModalJob;
  onCancel?: () => void;
  children?: ReactNode;
}

export default function JobFormModal({
  onJobSaved,
  job,
  onCancel,
  children,
}: JobFormModalProps) {
  const [open, setOpen] = useState(false);
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
  const [fieldErrors, setFieldErrors] = useState<{
    client?: string;
    cleaner?: string;
    datetime?: string;
  }>({});

  // Prefill form fields if editing
  useEffect(() => {
    if (job) {
      setOpen(true);
      setClientId(job.client_id);
      setCleanerId(job.cleaner_id);
      setDatetime(convertUTCToLocal(job.scheduled_start));
      setNotes(job.notes || "");
      setStatus(job.status || JOB_STATUS_OPTIONS[0]);
    }
    // Do not auto-open for create mode; open is controlled by Add Job button
    // Do not reset form here for create mode; handled by Add Job button
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

  const resetForm = () => {
    setClientId("");
    setCleanerId("");
    setDatetime("");
    setNotes("");
    setStatus(JOB_STATUS_OPTIONS[0]);
    setError(null);
    setFieldErrors({});
  };

  const validateForm = () => {
    const errors: {
      client?: string;
      cleaner?: string;
      datetime?: string;
    } = {};
    
    if (!clientId) {
      errors.client = "Client is required";
    } else if (!validateUUID(clientId)) {
      errors.client = "Invalid client selection";
    }
    
    if (!cleanerId) {
      errors.cleaner = "Cleaner is required";
    } else if (!validateUUID(cleanerId)) {
      errors.cleaner = "Invalid cleaner selection";
    }
    
    if (!datetime) {
      errors.datetime = "Date and time are required";
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) {
      setError(null);
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
    resetForm();
    if (onCancel) onCancel();
  }

  return (
    <>
      {!job && !open && (
        children ? (
          <span onClick={() => { resetForm(); setOpen(true); }} style={{ display: 'inline-block', cursor: 'pointer' }}>{children}</span>
        ) : (
          <Button
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
            className="gap-2 shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Job</span>
          </Button>
        )
      )}
      
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          resetForm();
          if (onCancel) onCancel();
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">{job ? "Edit Job" : "Create New Job"}</DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              {job ? "Update the job details below." : "Fill in the details to create a new job."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 py-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-client" className="flex items-center gap-1 text-base font-semibold text-gray-800">
                  <Users className="h-4 w-4" />
                  Client <span className="text-destructive">*</span>
                </Label>
                <Select
                  disabled={loading || clientsLoading}
                  value={clientId}
                  onValueChange={setClientId}
                >
                  <SelectTrigger id="job-client" className={fieldErrors.client ? "border-destructive ring-destructive/10" : ""}>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Loading clients...</span>
                      </div>
                    ) : (
                      clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {fieldErrors.client && (
                  <p className="text-xs text-destructive">{fieldErrors.client}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="job-cleaner" className="flex items-center gap-1 text-base font-semibold text-gray-800">
                  <User className="h-4 w-4" />
                  Cleaner <span className="text-destructive">*</span>
                </Label>
                <Select
                  disabled={loading || cleanersLoading}
                  value={cleanerId}
                  onValueChange={setCleanerId}
                >
                  <SelectTrigger id="job-cleaner" className={fieldErrors.cleaner ? "border-destructive ring-destructive/10" : ""}>
                    <SelectValue placeholder="Select cleaner" />
                  </SelectTrigger>
                  <SelectContent>
                    {cleanersLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Loading cleaners...</span>
                      </div>
                    ) : (
                      cleaners.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {bookedCleanerIds.includes(c.id) && " (Booked)"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {fieldErrors.cleaner && (
                  <p className="text-xs text-destructive">{fieldErrors.cleaner}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="job-datetime" className="flex items-center gap-1 text-base font-semibold text-gray-800">
                  <Calendar className="h-4 w-4" />
                  Date & Time <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="job-datetime"
                    type="datetime-local"
                    className={`pl-9 ${fieldErrors.datetime ? "border-destructive ring-destructive/10" : ""}`}
                    value={datetime}
                    onChange={e => setDatetime(e.target.value)}
                    disabled={loading}
                  />
                </div>
                {isPast && (
                  <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mt-2 text-yellow-800 text-sm" style={{marginTop: 0}}>
                    <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    <span>This job is scheduled in the past. Reminders will not be sent automatically.</span>
                  </div>
                )}
                {fieldErrors.datetime && (
                  <p className="text-xs text-destructive">{fieldErrors.datetime}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="job-status" className="text-base font-semibold text-gray-800">Status</Label>
                <Select
                  disabled={loading}
                  value={status}
                  onValueChange={setStatus}
                >
                  <SelectTrigger id="job-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_STATUS_OPTIONS.map((option: string) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="job-notes" className="text-base font-semibold text-gray-800">Notes (optional)</Label>
                <Textarea
                  id="job-notes"
                  placeholder="Any special instructions or notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  disabled={loading}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="text-base px-5 py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || clientsLoading || cleanersLoading}
                className="bg-blue-600 hover:bg-blue-700 focus:bg-blue-800 text-white text-base font-semibold px-5 py-2 shadow-md transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {loading ? (
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
    </>
  );
} 