'use client'

import { JOB_STATUS_OPTIONS, getStatusBadgeColor } from "../lib/constants";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "./ui/use-toast";
import { Button } from "./ui/button";
import { Pencil, Trash } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { formatUTCForDisplay, BUSINESS_TIMEZONE } from "../lib/utils";
import { DateTime } from "luxon";
import { Badge } from "./ui/badge";
import { Calendar, Clock, Send, User } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Separator } from "./ui/separator";
import { MessageSquare } from "lucide-react";

type Job = {
  id: string;
  scheduled_start: string;
  clientName: string;
  cleanerName: string;
  status: string;
  notes: string;
  client_id: string;
  on_my_way_sent?: boolean;
  on_my_way_time?: string | null;
  feedback_sent?: boolean;
  feedback_sent_at?: string | null;
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
  // Use local state for sent and sentTime, initialize from job props
  const [sent, setSent] = useState(job.on_my_way_sent || false);
  const [sentTime, setSentTime] = useState<string | null>(job.on_my_way_time || null);

  // Add after job destructure
  const nowEastern = DateTime.now().setZone(BUSINESS_TIMEZONE);
  const jobTimeEastern = DateTime.fromISO(job.scheduled_start).setZone(BUSINESS_TIMEZONE);
  const isPast = jobTimeEastern < nowEastern;
  const hoursOld = nowEastern.diff(jobTimeEastern, 'hours').hours;
  const disableOnMyWay = isPast && hoursOld > 12;

  async function handleOnMyWay() {
    // Prevent duplicate sends and UI race conditions
    if (sent || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/send-sms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const result = await res.json();
      if (result.success) {
        setSent(true);
        setSentTime(result.on_my_way_time || new Date().toISOString());
        toast({ title: "SMS sent", description: `On-My-Way SMS sent to client.` });
      } else if (result.error === 'On-My-Way SMS already sent') {
        setSent(true);
        setSentTime(result.on_my_way_time || sentTime);
        // No error toast, just update UI
      } else {
        toast({ title: "SMS failed", description: result.error || "Could not send SMS.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Unexpected Error", description: err.message || String(err), variant: "destructive" });
    }
    setSending(false);
  }

  async function handleSendFeedback() {
    try {
      const res = await fetch('/api/send-sms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Feedback SMS sent', description: 'Feedback request sent to client.' });
      } else if (result.error === 'Feedback SMS already sent') {
        toast({ title: 'Already Sent', description: 'Feedback SMS was already sent for this job.', variant: "destructive" });
      } else {
        toast({ title: 'SMS failed', description: result.error || 'Could not send feedback SMS.', variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: 'Unexpected Error', description: err.message || String(err), variant: "destructive" });
    }
  }

  return (
    <Card className={`overflow-hidden transition-all duration-200 hover:shadow-xl bg-white border border-gray-200 rounded-2xl p-0 shadow-lg ${isCompleted ? 'opacity-90' : ''}`} style={{ fontFamily: 'Inter, Roboto, Arial, sans-serif', fontSize: '1.08rem' }}>
      <CardHeader className="p-6 pb-3 relative">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 min-h-[40px]">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-500" />
            <span className="font-semibold text-lg text-gray-900">{dateString}</span>
            <Clock className="h-5 w-5 ml-3 text-blue-400" />
            <span className="font-semibold text-lg text-gray-900">{timeString}</span>
          </div>
          <div className="flex flex-row gap-2 items-center min-h-[32px] mt-2 sm:mt-0">
            <Badge 
              className={`px-4 py-1 text-sm font-bold rounded-full tracking-wide shadow-sm border-0 ${statusColor}`}
              style={{ textTransform: 'capitalize', letterSpacing: '0.04em' }}
            >
              {job.status}
            </Badge>
            {job.feedback_sent && (
              <Badge 
                className="bg-green-100 text-green-800 px-4 py-1 text-sm font-bold rounded-full tracking-wide shadow-sm border-0"
                style={{ textTransform: 'capitalize', letterSpacing: '0.04em' }}
              >
                Feedback Sent
              </Badge>
            )}
            {isDoubleBooked && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      className="bg-yellow-100 text-yellow-800 px-4 py-1 text-sm font-bold rounded-full tracking-wide shadow-sm border-0"
                      style={{ textTransform: 'capitalize', letterSpacing: '0.04em' }}
                    >
                      Double Booked
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Cleaner is assigned to another job at this time</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-400" />
            <span className="text-base text-gray-500">Client:</span>
            <span className="text-base font-semibold text-gray-900">{job.clientName || 'Unknown'}</span>
          </div>
          <Separator orientation="vertical" className="h-5 hidden sm:block" />
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-400" />
            <span className="text-base text-gray-500">Cleaner:</span>
            <span className="text-base font-semibold text-gray-900">{job.cleanerName || 'Unknown'}</span>
          </div>
        </div>
        {job.notes && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-base text-gray-700 border border-gray-100">
            <p className="line-clamp-2">{job.notes}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-6 pt-2 flex flex-col gap-3">
        <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-3">
          <Button
            className={`flex-1 gap-2 text-base font-semibold py-2 px-4 rounded-lg shadow-sm transition ${sent || disableOnMyWay ? 'opacity-60' : ''}`}
            onClick={handleOnMyWay}
            disabled={sending || sent || disableOnMyWay}
            variant={sent ? "secondary" : "default"}
            size="lg"
          >
            {sending ? (
              <>Sending...</>
            ) : sent ? (
              <>
                <MessageSquare className="h-4 w-4" />
                {sentTime
                  ? `Sent at ${formatUTCForDisplay(sentTime, undefined, 'h:mm A')}`
                  : "SMS Sent"}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send On My Way SMS
              </>
            )}
          </Button>
          <div className="flex gap-2 ml-0 sm:ml-3">
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
                      className="h-10 w-10 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                    >
                      <Pencil className="h-5 w-5 text-blue-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Edit Job</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {onDelete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onDelete(job)}
                      disabled={loading}
                      aria-label="Delete Job"
                      className="h-10 w-10 border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                    >
                      <Trash className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Delete Job</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        {job.status === 'Completed' && !job.feedback_sent && (
          <Button
            variant="secondary"
            size="lg"
            onClick={handleSendFeedback}
            className="w-full mt-2 text-base font-semibold py-2 px-4 rounded-lg shadow-sm"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Feedback Request
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 