import { Car, Clock, Wrench, MoreVertical, Printer, Share2, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import type { JobCard } from '@/types';
import { useStore, staffById, customerById } from '@/store/useStore';
import { StageBadge, PriorityBadge } from './StatusPill';
import { Avatar } from '@/components/ui/Avatar';
import { cn, formatCurrency, timeFromNow } from '@/lib/utils';
import { jobTotal } from '@/lib/jobUtils';
import { serviceById, nextStage, stageLabel, PENDING_WORK_META } from '@/lib/workflows';

interface JobCardTileProps {
  job: JobCard;
  onOpen?: (id: string) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export function JobCardTile({ job, onOpen, draggable, onDragStart }: JobCardTileProps) {
  const [menu, setMenu] = useState(false);
  const staff = useStore((s) => s.staff);
  const customers = useStore((s) => s.customers);
  const advanceStage = useStore((s) => s.advanceStage);

  const assignee = staffById(staff, job.assignedStaffId);
  const customer = customerById(customers, job.customerId);
  const nxt = nextStage(job.currentStage);

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={() => onOpen?.(job.id)}
      className={cn(
        'group relative cursor-pointer rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card transition-all',
        'hover:-translate-y-0.5 hover:shadow-card-hover dark:border-ink-800 dark:bg-ink-900',
        draggable && 'active:cursor-grabbing',
      )}
    >
      {/* top row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-ink-900 px-2 py-1 font-mono text-[11px] font-bold text-white dark:bg-brand-600">
            {job.vehicleNo}
          </span>
          {job.priority === 'high' && <PriorityBadge priority="high" />}
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenu((m) => !m);
            }}
            className="rounded-lg p-1 text-ink-400 opacity-0 transition-opacity hover:bg-ink-100 group-hover:opacity-100 dark:hover:bg-ink-800"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menu && (
            <QuickMenu
              onClose={() => setMenu(false)}
              onPrint={() => onOpen?.(job.id)}
              phone={customer?.phone ?? ''}
              job={job}
            />
          )}
        </div>
      </div>

      {/* car */}
      <div className="mt-3 flex items-center gap-2 text-ink-800 dark:text-ink-100">
        <Car className="h-4 w-4 text-ink-400" />
        <p className="font-bold">
          {job.make} {job.model}
        </p>
        <span className="text-xs text-ink-400">· {job.year}</span>
      </div>
      <p className="mt-0.5 truncate text-xs text-ink-500">{customer?.name}</p>

      {/* services */}
      <div className="mt-3 flex flex-wrap gap-1">
        {job.serviceIds.slice(0, 2).map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-md bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300"
          >
            <Wrench className="h-2.5 w-2.5" />
            {serviceById(id)?.name}
          </span>
        ))}
        {job.serviceIds.length > 2 && (
          <span className="rounded-md bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-500 dark:bg-ink-800">
            +{job.serviceIds.length - 2}
          </span>
        )}
      </div>

      {/* pending final jobs */}
      {job.pendingWork && job.pendingWork.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {job.pendingWork.map((k) => (
            <span
              key={k}
              className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            >
              {PENDING_WORK_META[k]?.short ?? k} pending
            </span>
          ))}
        </div>
      )}

      {/* footer */}
      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 dark:border-ink-800">
        <div className="flex items-center gap-2">
          {assignee ? (
            <Avatar name={assignee.name} color={assignee.avatarColor} size="sm" />
          ) : (
            <span className="text-[11px] font-medium text-amber-600">Unassigned</span>
          )}
          <div className="flex items-center gap-1 text-[11px] text-ink-400">
            <Clock className="h-3 w-3" />
            {timeFromNow(job.estimatedDelivery)}
          </div>
        </div>
        <p className="text-sm font-bold text-ink-900 dark:text-ink-50">{formatCurrency(jobTotal(job))}</p>
      </div>

      {/* quick advance */}
      {nxt && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            advanceStage(job.id);
          }}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-brand-50 py-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300"
        >
          Move to {stageLabel(nxt)}
          <ArrowRight className="h-3 w-3" />
        </button>
      )}

      <div className="mt-2 flex items-center justify-between">
        <StageBadge stage={job.currentStage} />
        <span className="font-mono text-[10px] text-ink-400">{job.id}</span>
      </div>
    </div>
  );
}

function QuickMenu({
  onClose,
  onPrint,
  phone,
  job,
}: {
  onClose: () => void;
  onPrint: () => void;
  phone: string;
  job: JobCard;
}) {
  const shareText = encodeURIComponent(
    `GarageHub update for ${job.vehicleNo} (${job.make} ${job.model}): now at "${stageLabel(job.currentStage)}" stage. Job ${job.id}.`,
  );
  const wa = `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${shareText}`;

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); onClose(); }} />
      <div
        className="absolute right-0 top-8 z-20 w-44 animate-scale-in overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-xl dark:border-ink-700 dark:bg-ink-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => { onPrint(); onClose(); }}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-700"
        >
          <Printer className="h-4 w-4 text-ink-400" /> Print / Open
        </button>
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          onClick={onClose}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-700"
        >
          <Share2 className="h-4 w-4 text-ink-400" /> Share on WhatsApp
        </a>
      </div>
    </>
  );
}
