import { useState } from 'react';
import { useStore, customerById } from '@/store/useStore';
import { PageHeader } from '@/components/layout/AppShell';
import { JobCardTile } from '@/components/shared/JobCardTile';
import { JobDetailDrawer } from '@/components/shared/JobDetailDrawer';
import { STAGES } from '@/lib/workflows';
import { cn } from '@/lib/utils';
import type { JobPriority, StageId } from '@/types';

const PRIORITY_FILTERS: { id: JobPriority | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'high', label: 'High' },
  { id: 'normal', label: 'Normal' },
  { id: 'low', label: 'Low' },
];

export function ServiceBoard({ onPrint }: { onPrint: (id: string) => void }) {
  const jobs = useStore((s) => s.jobs);
  const customers = useStore((s) => s.customers);
  const search = useStore((s) => s.search);
  const setStage = useStore((s) => s.setStage);
  const activeJobId = useStore((s) => s.activeJobId);
  const setActiveJob = useStore((s) => s.setActiveJob);

  const [priority, setPriority] = useState<JobPriority | 'all'>('all');
  const [dragOver, setDragOver] = useState<StageId | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = jobs.filter((j) => {
    if (priority !== 'all' && j.priority !== priority) return false;
    if (!q) return true;
    const cust = customerById(customers, j.customerId);
    return (
      j.vehicleNo.toLowerCase().includes(q) ||
      j.id.toLowerCase().includes(q) ||
      `${j.make} ${j.model}`.toLowerCase().includes(q) ||
      cust?.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col p-4 sm:p-6 lg:h-[calc(100vh-4rem)]">
      <PageHeader
        title="Service Board"
        subtitle="Drag cards across stages to update status"
        actions={
          <div className="flex gap-1 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
            {PRIORITY_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setPriority(f.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  priority === f.id
                    ? 'bg-white text-brand-600 shadow-sm dark:bg-ink-900'
                    : 'text-ink-500 hover:text-ink-700',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex flex-1 snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-thin pb-4 sm:snap-none">
        {STAGES.map((stage) => {
          const cards = filtered.filter((j) => j.currentStage === stage.id);
          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(stage.id);
              }}
              onDragLeave={() => setDragOver((d) => (d === stage.id ? null : d))}
              onDrop={(e) => {
                const id = e.dataTransfer.getData('text/plain');
                if (id) setStage(id, stage.id);
                setDragOver(null);
              }}
              className={cn(
                'flex w-[80vw] max-w-xs shrink-0 snap-start flex-col rounded-2xl border transition-colors sm:w-72',
                dragOver === stage.id
                  ? 'border-brand-400 bg-brand-50/60 dark:bg-brand-950/30'
                  : 'border-ink-200/70 bg-ink-100/50 dark:border-ink-800 dark:bg-ink-900/40',
              )}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">{stage.label}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-ink-500 dark:bg-ink-800">
                    {cards.length}
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin px-3 pb-3">
                {cards.map((job) => (
                  <JobCardTile
                    key={job.id}
                    job={job}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', job.id)}
                    onOpen={setActiveJob}
                  />
                ))}
                {cards.length === 0 && (
                  <div className="rounded-xl border border-dashed border-ink-300 py-8 text-center text-xs text-ink-400 dark:border-ink-700">
                    Drop cars here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <JobDetailDrawer jobId={activeJobId} onClose={() => setActiveJob(null)} onPrint={onPrint} />
    </div>
  );
}
