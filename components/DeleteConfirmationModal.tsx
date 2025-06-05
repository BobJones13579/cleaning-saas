import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "./ui/alert-dialog";
import { Trash } from "lucide-react";
import { Button } from "./ui/button";
import React from "react";

interface DeleteConfirmationModalProps {
  open: boolean;
  entityName: string;
  entityType: string;
  loading?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmationModal({
  open,
  entityName,
  entityType,
  loading = false,
  error,
  onCancel,
  onConfirm,
}: DeleteConfirmationModalProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="rounded-xl shadow-lg border border-gray-100 p-4 sm:p-8 max-w-xs sm:max-w-md w-full">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base sm:text-lg font-extrabold tracking-tight mb-2 flex items-center gap-2 text-gray-900">
            <Trash className="w-5 h-5 text-red-500" />
            Delete {entityType}
          </AlertDialogTitle>
          <AlertDialogDescription className="mb-4 text-gray-700">
            Are you sure you want to delete <span className="font-semibold">{entityName}</span>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <AlertDialogFooter className="flex gap-2 justify-end mt-4">
          <AlertDialogCancel className="rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-medium px-4 py-2" onClick={onCancel} disabled={loading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction className="rounded bg-red-600 text-white font-semibold hover:bg-red-700 transition px-4 py-2 disabled:opacity-50" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 