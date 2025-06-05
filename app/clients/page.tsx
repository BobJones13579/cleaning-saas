"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ClientList from "../../components/ClientList";
import ClientFormModal, { Client } from "../../components/ClientFormModal";
import { useToast } from "@/components/ui/use-toast";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

export default function ClientsPage() {
  // All hooks must be called at the top level, before any return
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  // Fetch clients after component mounts
  useEffect(() => {
    fetchClients();
  }, []);

  // Early return for loading/auth state (after all hooks)
  if (isCheckingAuth || session === null) {
    return <div className="text-center py-16 text-lg text-gray-400">Loading...</div>;
  }

  async function fetchClients() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, phone, email, address")
        .order("name", { ascending: true });
      if (error) {
        setError(error.message);
        setClients([]);
      } else {
        setClients(data || []);
      }
    } catch (err) {
      setError("Unexpected error: " + (err as Error).message);
      setClients([]);
    }
    setLoading(false);
  }

  async function handleDeleteClient(client: Client) {
    setDeletingId(client.id || null);
    setDeleteLoading(true);
    setDeleteError(null);
    console.log('[DeleteClient] Attempting to delete client:', client);
    // Check auth state
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    console.log('[DeleteClient] Auth user:', authUser, 'Auth error:', authError);
    if (authError || !authUser?.user) {
      setDeleteError('Not authenticated. Please log in.');
      setDeleteLoading(false);
      toast({ title: 'Not Authenticated', description: 'Please log in to delete clients.', variant: 'destructive' });
      return;
    }
    // Check for jobs assigned to this client
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('client_id', client.id);
    console.log('[DeleteClient] Jobs check:', jobs, jobsError);
    if (jobsError) {
      setDeleteError(jobsError.message);
      setDeleteLoading(false);
      toast({ title: 'Error', description: jobsError.message, variant: 'destructive' });
      return;
    }
    if (jobs && jobs.length > 0) {
      setDeleteError('Cannot delete client: there are jobs assigned to this client.');
      setDeleteLoading(false);
      toast({ title: 'Cannot Delete', description: 'This client is assigned to one or more jobs.', variant: 'destructive' });
      return;
    }
    // Proceed to delete
    const { error: deleteErrorObj, data: deleteData } = await supabase
      .from('clients')
      .delete()
      .eq('id', client.id)
      .select();
    console.log('[DeleteClient] Delete response:', deleteData, deleteErrorObj);
    if (deleteErrorObj) {
      setDeleteError(deleteErrorObj.message);
      toast({ title: 'Error', description: deleteErrorObj.message, variant: 'destructive' });
    } else {
      toast({ title: 'Client Deleted', description: `${client.name} was deleted.`, variant: 'default' });
      fetchClients();
    }
    setDeleteLoading(false);
    setDeletingId(null);
  }

  function handleAddClient() {
    setEditingClient(undefined);
    setShowModal(true);
  }

  function handleEditClient(client: Client) {
    setEditingClient(client);
    setShowModal(true);
  }

  return (
    <main className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <button
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          onClick={handleAddClient}
        >
          + Add Client
        </button>
      </div>
      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading clients...</div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">Error: {error}</div>
      ) : (
        <ClientList
          clients={clients}
          onEditClient={handleEditClient}
          onDeleteClient={handleDeleteClient}
        />
      )}
      {showModal && (
        <ClientFormModal
          client={editingClient}
          onClose={() => setShowModal(false)}
          onSave={fetchClients}
        />
      )}
      {/* Global delete modal for loading/error feedback */}
      <DeleteConfirmationModal
        open={!!deletingId}
        entityName={clients.find(c => c.id === deletingId)?.name || ''}
        entityType="Client"
        loading={deleteLoading}
        error={deleteError}
        onCancel={() => {
          setDeletingId(null);
          setDeleteLoading(false);
          setDeleteError(null);
        }}
        onConfirm={() => {
          const client = clients.find(c => c.id === deletingId);
          if (client) handleDeleteClient(client);
        }}
      />
    </main>
  );
} 