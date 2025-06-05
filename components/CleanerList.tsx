import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { Trash, Pencil } from "lucide-react";
import { Button } from "./ui/button";
import React, { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export type Cleaner = {
  id: string;
  name: string;
  phone: string;
  status?: string;
  owner_id: string;
};

function StatusBadge({ status }: { status?: string }) {
  return (
    <span
      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
        status === "active" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
      }`}
    >
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );
}

export default function CleanerList({ cleaners, onDeleteCleaner, onEditCleaner }: { cleaners: Cleaner[]; onDeleteCleaner: (cleaner: Cleaner) => void; onEditCleaner: (cleaner: Cleaner) => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null);

  const handleDeleteClick = (cleaner: Cleaner) => {
    setSelectedCleaner(cleaner);
    setModalOpen(true);
  };
  const handleCancel = () => {
    setModalOpen(false);
    setSelectedCleaner(null);
  };
  const handleConfirm = () => {
    if (selectedCleaner) {
      onDeleteCleaner(selectedCleaner);
      setModalOpen(false);
      setSelectedCleaner(null);
    }
  };
  // Show a message if there are no employees
  if (cleaners.length === 0) {
    return <div className="text-center text-gray-400 py-16 text-lg">No cleaners found.</div>;
  }
  return (
    <>
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {cleaners.map((cleaner) => (
          <div
            key={cleaner.id}
            className="rounded-xl border border-gray-100 bg-white shadow-md hover:shadow-lg p-4 sm:p-6 flex flex-col gap-2 transition group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-1 sm:gap-0">
              <span className="font-bold text-base sm:text-lg text-gray-900">{cleaner.name}</span>
              <StatusBadge status={cleaner.status} />
            </div>
            <div className="text-sm text-gray-700">{cleaner.phone}</div>
            <div className="flex gap-2 justify-end mt-2 sm:mt-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEditCleaner(cleaner)}
                      className="transition hover:bg-blue-100 rounded-lg border border-blue-200"
                      aria-label="Edit Cleaner"
                    >
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(cleaner)}
                      className="transition hover:bg-red-100 rounded-lg border border-transparent"
                      aria-label="Delete Cleaner"
                    >
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        ))}
      </div>
      <DeleteConfirmationModal
        open={modalOpen}
        entityName={selectedCleaner?.name || ""}
        entityType="Cleaner"
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    </>
  );
} 