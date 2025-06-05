// Shared constants for the cleaning dashboard app

export const JOB_STATUS_OPTIONS = [
  "Scheduled",
  "In Progress",
  "Completed",
  "Cancelled"
]; 

export function getStatusBadgeColor(status: string) {
  switch (status) {
    case "Scheduled":
      return "bg-blue-100 text-blue-800";
    case "In Progress":
      return "bg-yellow-100 text-yellow-800";
    case "Completed":
      return "bg-green-100 text-green-800";
    case "Cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
} 