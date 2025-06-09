"use client"
import JobList from "../../components/JobList";
import JobFormModal from "../../components/JobFormModal";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  // All hooks must be called at the top level, before any return
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deletingJob, setDeletingJob] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { toast } = useToast();
  const { session } = useAuth();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication state
  useEffect(() => {
    if (session === null) {
      router.replace("/login");
    } else if (session) {
      setIsCheckingAuth(false);
    }
  }, [session, router]);

  // Fetch jobs after component mounts
  useEffect(() => {
    fetchJobs();
  }, []);

  // Early return for loading/auth state (after all hooks)
  if (isCheckingAuth || session === null) {
    return <div className="text-center py-16 text-lg text-gray-400">Loading...</div>;
  }

  // Fetch jobs with correct schema and relationships
  async function fetchJobs() {
    setLoading(true);
    setError(null);
    try {
      // Fetch jobs and join client and cleaner names using correct join syntax
      const { data, error } = await supabase
        .from("jobs")
        .select(`id, scheduled_start, status, notes, client_id, cleaner_id, feedback_sent, feedback_sent_at, on_my_way_sent, on_my_way_time, clients:client_id(name), cleaners:cleaner_id(name)`)
        .order("scheduled_start", { ascending: true });
      console.log('[Dashboard] Raw jobs from Supabase:', data);
      if (error) {
        setError(error.message);
        setJobs([]);
      } else {
        // Transform jobs to use actual client and cleaner names
        const transformed = (data || []).map((job: any) => ({
          id: job.id,
          scheduled_start: job.scheduled_start,
          clientName: job.clients?.name || 'Unknown',
          cleanerName: job.cleaners?.name || 'Unknown',
          status: job.status,
          notes: job.notes,
          client_id: job.client_id,
          cleaner_id: job.cleaner_id,
          feedback_sent: job.feedback_sent,
          feedback_sent_at: job.feedback_sent_at,
          on_my_way_sent: job.on_my_way_sent,
          on_my_way_time: job.on_my_way_time,
        }));
        console.log('[Dashboard] Transformed jobs:', transformed);
        setJobs(transformed);
      }
    } catch (err) {
      setError('Unexpected error: ' + (err as Error).message);
      setJobs([]);
    }
    setLoading(false);
  }

  // Edit job handler
  function handleEditJob(job: any) {
    setEditingJob(job);
    setEditModalOpen(true);
  }

  // Delete job handler
  function handleDeleteJob(job: any) {
    setDeletingJob(job);
    setDeleteError(null);
  }

  // Confirm delete
  async function confirmDeleteJob() {
    if (!deletingJob) return;
    setDeleteLoading(true);
    setDeleteError(null);
    // Safety check: only allow delete if not Completed
    if (deletingJob.status === "Completed") {
      setDeleteError("Cannot delete a completed job.");
      setDeleteLoading(false);
      toast({ title: "Cannot Delete", description: "Completed jobs cannot be deleted.", variant: "destructive" });
      return;
    }
    // Delete job
    const { error: deleteErrorObj } = await supabase
      .from("jobs")
      .delete()
      .eq("id", deletingJob.id);
    if (deleteErrorObj) {
      setDeleteError(deleteErrorObj.message);
      toast({ title: "Error", description: deleteErrorObj.message, variant: "destructive" });
    } else {
      toast({ title: "Job Deleted", description: "The job was deleted.", variant: "default" });
      fetchJobs();
      setDeletingJob(null);
    }
    setDeleteLoading(false);
  }

  // Save job (edit)
  async function handleJobSaved() {
    setEditModalOpen(false);
    setEditingJob(null);
    fetchJobs();
  }

  // Ensure modal closes and editingJob is reset on cancel
  function handleEditModalClose() {
    setEditModalOpen(false);
    setEditingJob(null);
  }

  return (
    <main className="max-w-3xl mx-auto py-10 px-4 sm:px-2 w-full">
      {/* Responsive header: stack vertically on mobile */}
      <div className="flex flex-row items-center gap-4 mb-8">
        <div className="text-xl sm:text-2xl font-extrabold tracking-tight px-1 sm:px-2 text-gray-900">All Jobs</div>
        <JobFormModal onJobSaved={fetchJobs}>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 focus:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-200"
            type="button"
          >
            <span className="text-lg font-bold">+</span> Add Job
          </button>
        </JobFormModal>
      </div>
      {loading ? (
        <div className="text-center text-gray-400 py-16 text-lg">Loading jobs...</div>
      ) : error ? (
        <div className="text-center text-red-500 py-16 text-lg">Error: {error}</div>
      ) : (
        <JobList
          jobs={jobs}
          onEditJob={handleEditJob}
          onDeleteJob={handleDeleteJob}
          loadingJobId={deleteLoading ? deletingJob?.id : null}
        />
      )}
      {/* Edit Job Modal */}
      {editModalOpen && (
        <JobFormModal
          job={editingJob}
          onJobSaved={handleJobSaved}
          onCancel={handleEditModalClose}
        />
      )}
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={!!deletingJob}
        entityName={deletingJob?.clientName + ' - ' + deletingJob?.scheduled_start || ''}
        entityType="Job"
        loading={deleteLoading}
        error={deleteError}
        onCancel={() => {
          setDeletingJob(null);
          setDeleteLoading(false);
          setDeleteError(null);
        }}
        onConfirm={confirmDeleteJob}
      />
    </main>
  );
} 