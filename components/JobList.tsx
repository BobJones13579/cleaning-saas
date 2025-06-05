import JobCard from "./JobCard";
import { useMemo } from "react";

type Job = {
  id: string;
  scheduled_start: string;
  clientName: string;
  cleanerName: string;
  status: string;
  notes: string;
  client_id: string;
};

interface JobListProps {
  jobs: Job[];
  onEditJob?: (job: Job) => void;
  onDeleteJob?: (job: Job) => void;
  loadingJobId?: string | null;
}

export default function JobList({ jobs, onEditJob, onDeleteJob, loadingJobId }: JobListProps) {
  // Build a map: key = cleaner_id + scheduled_start, value = array of job ids
  const doubleBookedMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    jobs.forEach(job => {
      if (job.cleanerName && job.scheduled_start) {
        const key = `${job.cleanerName}__${job.scheduled_start}`;
        if (!map[key]) map[key] = [];
        map[key].push(job.id);
      }
    });
    return map;
  }, [jobs]);

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      {jobs.length > 0 ? (
        <div>
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight mb-3 sm:mb-4 px-1 sm:px-2 text-gray-900">All Jobs</div>
          <div className="space-y-4 sm:space-y-6">
            {jobs.map((job) => {
              const key = `${job.cleanerName}__${job.scheduled_start}`;
              const isDoubleBooked = doubleBookedMap[key] && doubleBookedMap[key].length > 1;
              return (
                <JobCard
                  key={job.id}
                  job={job}
                  onEdit={onEditJob}
                  onDelete={onDeleteJob}
                  loading={loadingJobId === job.id}
                  isDoubleBooked={isDoubleBooked}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400 py-10 sm:py-16 text-base sm:text-lg">No jobs scheduled.</div>
      )}
    </div>
  );
} 