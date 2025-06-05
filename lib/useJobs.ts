import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { validate as validateUUID } from "uuid";

export function useJobs() {
  // Fetch all clients (id, name)
  const fetchClients = useCallback(async () => {
    const { data, error } = await supabase.from("clients").select("id, name");
    if (error) return [];
    // Filter out clients with missing or invalid UUIDs
    return (data || []).filter(c => c.id && validateUUID(c.id));
  }, []);

  // Fetch all cleaners (id, name)
  const fetchCleaners = useCallback(async () => {
    const { data, error } = await supabase.from("cleaners").select("id, name");
    if (error) return [];
    // Filter out cleaners with missing or invalid UUIDs
    return (data || []).filter(c => c.id && validateUUID(c.id));
  }, []);

  // Helper to normalize UUID fields
  const normalizeUUID = (val: any) =>
    typeof val === "string" && val.trim() !== "" && validateUUID(val) ? val : null;

  // Save (insert or update) a job
  const saveJob = useCallback(async (jobData: Record<string, any>, jobId?: string) => {
    // Robust normalization for all UUID fields
    const normalizedJobData = {
      ...jobData,
      client_id: normalizeUUID(jobData.client_id),
      cleaner_id: normalizeUUID(jobData.cleaner_id),
      owner_id: normalizeUUID(jobData.owner_id),
    };
    if (jobId) {
      // Update
      const { error } = await supabase
        .from("jobs")
        .update(normalizedJobData)
        .eq("id", jobId);
      return error ? error.message : null;
    } else {
      // Insert
      const { error } = await supabase
        .from("jobs")
        .insert([normalizedJobData]);
      return error ? error.message : null;
    }
  }, []);

  return { fetchClients, fetchCleaners, saveJob };
} 