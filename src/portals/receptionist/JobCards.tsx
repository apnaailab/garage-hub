import { useState } from 'react';
import { Printer, Share2, Eye, Search } from 'lucide-react';
import { useStore, customerById, staffById } from '@/store/useStore';
import { PageHeader } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { StageBadge, PriorityBadge } from '@/components/shared/StatusPill';
import { JobDetailDrawer } from '@/components/shared/JobDetailDrawer';
import { serviceById, stageLabel } from '@/lib/workflows';
import { formatCurrency } from '@/lib/utils';
import { jobTotal } from '@/lib/jobUtils';

export function JobCards({ onPrint }: { onPrint: (id: string) => void }) {
  const jobs = useStore((s) => s.jobs);
  const customers = useStore((s) => s.customers);
  const staff = useStore((s) => s.staff);
  const activeJobId = useStore((s) => s.activeJobId);
  const setActiveJob = useStore((s) => s.setActiveJob);
  const [q, setQ] = useState('');

  const query = q.trim().toLowerCase();
  const filtered = jobs.filter((j) => {
    if (!query) return true;
    const c = customerById(customers, j.customerId);
    return (
      j.vehicleNo.toLowerCase().includes(query) ||
      j.id.toLowerCase().includes(query) ||
      `${j.make} ${j.model}`.toLowerCase().includes(query) ||
      c?.name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <PageHeader
        title="Job Cards"
        subtitle={`${jobs.length} cards in the system`}
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter cards…"
              className="h-10 w-64 rounded-xl border border-ink-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900"
            />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((job) => {
          const cust = customerById(customers, job.customerId);
          const assignee = staffById(staff, job.assignedStaffId);
          const waText = encodeURIComponent(
            `GarageHub: ${job.vehicleNo} (${job.make} ${job.model}) is now at "${stageLabel(job.currentStage)}". Job ${job.id}.`,
          );
          return (
            <Card key={job.id} className="overflow-hidden">
              {/* physical card top strip */}
              <div className="flex items-center justify-between bg-gradient-to-r from-ink-900 to-ink-800 px-4 py-2.5 text-white dark:from-brand-800 dark:to-brand-900">
                <span className="font-mono text-sm font-bold">{job.vehicleNo}</span>
                <span className="font-mono text-[11px] opacity-70">{job.id}</span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">
                      {job.make} {job.model}
                    </p>
                    <p className="text-xs text-ink-400">{cust?.name}</p>
                  </div>
                  <PriorityBadge priority={job.priority} />
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {job.serviceIds.map((id) => (
                    <span
                      key={id}
                      className="rounded-md bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300"
                    >
                      {serviceById(id)?.name}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 dark:border-ink-800">
                  <div className="flex items-center gap-2">
                    {assignee && <Avatar name={assignee.name} color={assignee.avatarColor} size="sm" />}
                    <StageBadge stage={job.currentStage} />
                  </div>
                  <span className="text-sm font-bold">{formatCurrency(jobTotal(job))}</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setActiveJob(job.id)}>
                    <Eye className="h-3.5 w-3.5" /> View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onPrint(job.id)}>
                    <Printer className="h-3.5 w-3.5" /> Print
                  </Button>
                  <a
                    href={`https://wa.me/${cust?.phone.replace(/[^\d]/g, '') ?? ''}?text=${waText}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <JobDetailDrawer jobId={activeJobId} onClose={() => setActiveJob(null)} onPrint={onPrint} />
    </div>
  );
}
