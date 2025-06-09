"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import CleanerList, { Cleaner } from "../../components/CleanerList";
import CleanerFormModal from "../../components/CleanerFormModal";
import { useToast } from "@/components/ui/use-toast";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

export default function CleanersPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { toast } = useToast();
  const [editingCleaner, setEditingCleaner] = useState<Cleaner | undefined>(undefined);

  useEffect(() => {
    if (session === null) {
      router.replace("/login");
    } else if (session) {
      setIsCheckingAuth(false);
    }
  }, [session, router]);

  useEffect(() => {
    fetchCleaners();
  }, []);

  if (isCheckingAuth || session === null) {
    return <div className="text-center py-16 text-lg text-gray-400">Loading...</div>;
  }

  async function fetchCleaners() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("cleaners")
        .select("id, name, phone, status, owner_id")
        .order("name", { ascending: true });
      if (error) {
        setError(error.message);
        setCleaners([]);
      } else {
        setCleaners(data || []);
      }
    } catch (err) {
      setError("Unexpected error: " + (err as Error).message);
      setCleaners([]);
    }
    setLoading(false);
  }

  async function handleDeleteCleaner(cleaner: Cleaner) {
    setDeletingId(cleaner.id);
    setDeleteLoading(true);
    setDeleteError(null);
    console.log('[DeleteCleaner] Attempting to delete cleaner:', cleaner);
    // Check auth state
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    console.log('[DeleteCleaner] Auth user:', authUser, 'Auth error:', authError);
    if (authError || !authUser?.user) {
      setDeleteError('Not authenticated. Please log in.');
      setDeleteLoading(false);
      toast({ title: 'Not Authenticated', description: 'Please log in to delete cleaners.', variant: 'destructive' });
      return;
    }
    // Check for jobs assigned to this cleaner
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('cleaner_id', cleaner.id);
    console.log('[DeleteCleaner] Jobs check:', jobs, jobsError);
    if (jobsError) {
      setDeleteError(jobsError.message);
      setDeleteLoading(false);
      toast({ title: 'Error', description: jobsError.message, variant: 'destructive' });
      return;
    }
    if (jobs && jobs.length > 0) {
      setDeleteError('Cannot delete cleaner: there are jobs assigned to this cleaner.');
      setDeleteLoading(false);
      toast({ title: 'Cannot Delete', description: 'This cleaner is assigned to one or more jobs.', variant: 'destructive' });
      return;
    }
    // Proceed to delete
    const { error: deleteErrorObj, data: deleteData } = await supabase
      .from('cleaners')
      .delete()
      .eq('id', cleaner.id)
      .select();
    console.log('[DeleteCleaner] Delete response:', deleteData, deleteErrorObj);
    if (deleteErrorObj) {
      setDeleteError(deleteErrorObj.message);
      toast({ title: 'Error', description: deleteErrorObj.message, variant: 'destructive' });
    } else {
      toast({ title: 'Cleaner Deleted', description: `${cleaner.name} was deleted.`, variant: 'default' });
      fetchCleaners();
    }
    setDeleteLoading(false);
    setDeletingId(null);
  }

  function handleEditCleaner(cleaner: Cleaner) {
    setEditingCleaner(cleaner);
    setModalOpen(true);
  }

  return (
    <main className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cleaners</h1>
        <button
          className="gap-2 shadow-md bg-blue-600 hover:bg-blue-700 focus:bg-blue-800 text-white text-base font-semibold px-5 py-2 rounded-lg transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
          onClick={() => { setEditingCleaner(undefined); setModalOpen(true); }}
        >
          + Add Cleaner
        </button>
      </div>
      {modalOpen && (
        <CleanerFormModal
          cleaner={editingCleaner}
          onClose={() => setModalOpen(false)}
          onSave={fetchCleaners}
        />
      )}
      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading cleaners...</div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">Error: {error}</div>
      ) : (
        <CleanerList
          cleaners={cleaners}
          onDeleteCleaner={handleDeleteCleaner}
          onEditCleaner={handleEditCleaner}
        />
      )}
      {/* Global delete modal for loading/error feedback */}
      <DeleteConfirmationModal
        open={!!deletingId}
        entityName={cleaners.find(c => c.id === deletingId)?.name || ''}
        entityType="Cleaner"
        loading={deleteLoading}
        error={deleteError}
        onCancel={() => {
          setDeletingId(null);
          setDeleteLoading(false);
          setDeleteError(null);
        }}
        onConfirm={() => {
          const cleaner = cleaners.find(c => c.id === deletingId);
          if (cleaner) handleDeleteCleaner(cleaner);
        }}
      />
    </main>
  );
} 