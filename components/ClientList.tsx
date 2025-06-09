import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { Trash, Pencil, User } from "lucide-react";
import { Button } from "./ui/button";
import React, { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Avatar, AvatarFallback } from "./ui/avatar";
import EntityCard from "./EntityCard";

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
      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-8">
        {clients.map((client) => (
          <EntityCard
            key={client.id}
            headerIcon={
              <Avatar>
                <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
            }
            title={client.name}
            badges={[]}
            mainInfo={
              <>
                <div className="text-sm text-gray-700 flex items-center gap-2 mb-1">
                  <span>{client.phone || "No phone"}</span>
                </div>
                <div className="text-xs sm:text-sm text-gray-500 truncate">{formatAddress(client)}</div>
              </>
            }
            actions={
              <div className="flex gap-2 ml-0 sm:ml-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onEditClient(client)}
                        aria-label={`Edit client ${client.name}`}
                        className="h-10 w-10 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                      >
                        <Pencil className="h-5 w-5 text-blue-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Edit Client</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteClick(client)}
                        aria-label={`Delete client ${client.name}`}
                        className="h-10 w-10 border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                      >
                        <Trash className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Delete Client</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            }
          />
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