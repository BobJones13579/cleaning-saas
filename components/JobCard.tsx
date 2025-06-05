'use client'

import { JOB_STATUS_OPTIONS, getStatusBadgeColor } from "../lib/constants";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "./ui/use-toast";
import { Button } from "./ui/button";
import { Pencil, Trash } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { formatUTCForDisplay } from "../lib/utils";

type Job = {
  id: string;
  scheduled_start: string;
  clientName: string;
  cleanerName: string;
  status: string;
  notes: string;
  client_id: string;
};

interface JobCardProps {
  job: Job;
  onEdit?: (job: Job) => void;
  onDelete?: (job: Job) => void;
  loading?: boolean;
  isDoubleBooked?: boolean;
}

export default function JobCard({ job, onEdit, onDelete, loading, isDoubleBooked }: JobCardProps) {
  // Display job time in business time zone using utility
  const dateString = formatUTCForDisplay(job.scheduled_start, undefined, 'MMM D, YYYY');
  const timeString = formatUTCForDisplay(job.scheduled_start, undefined, 'h:mm A');
  const statusColor = getStatusBadgeColor(job.status);
  const isCompleted = job.status === "Completed";

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleOnMyWay() {
    setSending(true);
    try {
      const res = await fetch("/api/send-sms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: "SMS sent", description: `On-My-Way SMS sent to client.` });
        setSent(true);
      } else {
        toast({ title: "SMS failed", description: result.error || "Could not send SMS.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Unexpected Error", description: err.message || String(err), variant: "destructive" });
    }
    setSending(false);
  }

  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-md p-4 sm:p-6 relative w-full max-w-full transition hover:shadow-lg ${isCompleted ? 'opacity-80' : ''}`}>
      {/* Status badge top-right, move to static on mobile */}
      <span className={`sm:absolute sm:top-4 sm:right-4 inline-block px-3 py-1 text-xs sm:text-xs font-semibold rounded-full shadow-sm border ${statusColor} bg-gray-100 text-gray-700 mb-2 sm:mb-0`}>{job.status}</span>
      <div className="mb-2 sm:mb-3">
        <div className="font-bold text-base sm:text-lg mb-1 break-words">{dateString} at {timeString}</div>
        <div className="text-xs sm:text-sm text-gray-700 mb-1 flex flex-wrap gap-x-2 items-center">
          Client: <span className="font-medium">{job.clientName || 'Unknown'}</span> 
          <span className="mx-1 text-gray-400">•</span>
          Cleaner: <span className="font-medium">{job.cleanerName || 'Unknown'}</span>
          {isDoubleBooked && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-2 text-yellow-600 cursor-pointer" aria-label="Cleaner double-booked">
                    <svg xmlns="http://www.w3.org/2000/svg" className="inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Cleaner is assigned to another job at this time</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      {job.notes && (
        <div className="text-xs text-gray-500 mt-2 italic break-words line-clamp-3 max-h-12 overflow-hidden">{job.notes}</div>
      )}
      <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row gap-2 justify-end items-stretch sm:items-end">
        <Button
          className="w-full sm:w-auto font-semibold text-sm sm:text-base py-2"
          onClick={handleOnMyWay}
          disabled={sending || sent}
          variant="default"
        >
          {sending ? "Sending..." : sent ? "SMS Sent" : "Send On My Way SMS"}
        </Button>
        <div className="flex gap-2 w-full sm:w-auto">
          {onEdit && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onEdit(job)}
                    disabled={loading}
                    aria-label="Edit Job"
                    className="transition hover:bg-blue-50"
                  >
                    <Pencil className="w-4 h-4 text-blue-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {onDelete && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(job)}
                    disabled={loading}
                    aria-label="Delete Job"
                    className="transition hover:bg-red-50"
                  >
                    <Trash className="w-4 h-4 text-red-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
} 