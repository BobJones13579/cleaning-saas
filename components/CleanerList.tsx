import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { Trash, Pencil, User } from "lucide-react";
import { Button } from "./ui/button";
import React, { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Avatar, AvatarFallback } from "./ui/avatar";
import EntityCard from "./EntityCard";

export type Cleaner = {
  id: string;
  name: string;
  phone: string;
  status?: string;
  owner_id: string;
};

function StatusBadge({ status }: { status?: string }) {
  const isActive = status === "active";
  return (
    <span
      className={`px-4 py-1 text-sm font-bold rounded-full tracking-wide shadow-sm border-0 ${
        isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
      }`}
      style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}
    >
      {isActive ? "Active" : "Inactive"}
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
      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-8">
        {cleaners.map((cleaner) => (
          <EntityCard
            key={cleaner.id}
            headerIcon={
              <Avatar>
                <AvatarFallback className="bg-green-100 text-green-700 font-bold">
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
            }
            title={cleaner.name}
            badges={[<StatusBadge status={cleaner.status} key="status" />]}
            mainInfo={
              <div className="text-sm text-gray-700 flex items-center gap-2 mb-1">
                <span>{cleaner.phone || "No phone"}</span>
              </div>
            }
            actions={
              <div className="flex gap-2 ml-0 sm:ml-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onEditCleaner(cleaner)}
                        aria-label={`Edit cleaner ${cleaner.name}`}
                        className="h-10 w-10 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                      >
                        <Pencil className="h-5 w-5 text-blue-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Edit Cleaner</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteClick(cleaner)}
                        aria-label={`Delete cleaner ${cleaner.name}`}
                        className="h-10 w-10 border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                      >
                        <Trash className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Delete Cleaner</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            }
          />
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