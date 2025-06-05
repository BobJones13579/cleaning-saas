import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { Trash, Pencil } from "lucide-react";
import { Button } from "./ui/button";
import React, { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
};

function formatAddress(client: Client) {
  return client.address || "No address provided";
}

export default function ClientList({ clients, onEditClient, onDeleteClient }: { clients: Client[]; onEditClient: (client: Client) => void; onDeleteClient: (client: Client) => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const handleDeleteClick = (client: Client) => {
    setSelectedClient(client);
    setModalOpen(true);
  };
  const handleCancel = () => {
    setModalOpen(false);
    setSelectedClient(null);
  };
  const handleConfirm = () => {
    if (selectedClient) {
      onDeleteClient(selectedClient);
      setModalOpen(false);
      setSelectedClient(null);
    }
  };
  // Show a message if there are no clients
  if (clients.length === 0) {
    return <div className="text-center text-gray-400 py-16 text-lg">No clients found.</div>;
  }
  return (
    <>
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => (
          <div key={client.id} className="rounded-xl border border-gray-100 bg-white shadow-md hover:shadow-lg p-4 sm:p-6 flex flex-col gap-2 transition group">
            <div className="font-bold text-base sm:text-lg mb-1 text-gray-900">{client.name}</div>
            <div className="text-sm text-gray-700 mb-1">{client.phone || "No phone"}</div>
            <div className="text-xs sm:text-sm text-gray-500">{formatAddress(client)}</div>
            <div className="flex gap-2 justify-end mt-2 sm:mt-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEditClient(client)}
                      className="transition hover:bg-blue-100 rounded-lg border border-blue-200"
                      aria-label="Edit Client"
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
                      onClick={() => handleDeleteClick(client)}
                      className="transition hover:bg-red-100 rounded-lg border border-transparent"
                      aria-label="Delete Client"
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
        entityName={selectedClient?.name || ""}
        entityType="Client"
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    </>
  );
} 