import {
  Car,
  IndianRupee,
  Timer,
  AlertTriangle,
  CheckCircle2,
  Wrench,
} from 'lucide-react';
import { useStore, customerById, staffById } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { PageHeader } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { StageBadge } from '@/components/shared/StatusPill';
import { StageProgress } from '@/components/shared/StageProgress';
import { JobDetailDrawer } from '@/components/shared/JobDetailDrawer';
import { STAGES } from '@/lib/workflows';
import { jobTotal } from '@/lib/jobUtils';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { StageId } from '@/types';

const PIPELINE_TONE: Record<StageId, { bar: string; label: string }> = {
  entry: { bar: 'bg-ink-500', label: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200' },
  estimate: { bar: 'bg-violet-500', label: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300' },
  'in-progress': { bar: 'bg-blue-500', label: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' },
  'final-jobs': { bar: 'bg-sky-500', label: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' },
  'quality-check': { bar: 'bg-amber-500', label: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  billing: { bar: 'bg-rose-500', label: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' },
  delivered: { bar: 'bg-emerald-500', label: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
};

export function Dashboard({ onPrint }: { onPrint: (id: string) => void }) {
  const canViewFinancials = useAuthStore((s) => ['admin', 'owner'].includes(s.user?.role ?? ''));
  const jobs = useStore((s) => s.jobs);
  const staff = useStore((s) => s.staff);
  const customers = useStore((s) => s.customers);
  const activeJobId = useStore((s) => s.activeJobId);
  const setActiveJob = useStore((s) => s.setActiveJob);

  const active = jobs.filter((j) => j.currentStage !== 'delivered');
  const revenue = jobs.reduce((s, j) => s + jobTotal(j), 0);
  const delivered = jobs.filter((j) => j.currentStage === 'delivered');
  const avgTurnaround =
    delivered.reduce((s, j) => {
      const start = new Date(j.createdAt).getTime();
      const end = new Date(j.stageHistory.at(-1)?.at ?? j.createdAt).getTime();
      return s + (end - start) / 3600_000;
    }, 0) / Math.max(delivered.length, 1);

  // stage distribution for the pipeline bar
  const byStage = STAGES.map((st) => ({
    stage: st,
    count: jobs.filter((j) => j.currentStage === st.id).length,
  }));
  const maxCount = Math.max(...byStage.map((b) => b.count), 1);

  // bottleneck = non-terminal stage with most cars
  const bottleneck = [...byStage]
    .filter((b) => b.stage.id !== 'delivered')
    .sort((a, b) => b.count - a.count)[0];

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <PageHeader
        title="Operations Dashboard"
        subtitle="Live snapshot of your garage floor"
      />

      {/* metrics */}
      <div className={cn('grid grid-cols-2 gap-4', canViewFinancials ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        <Metric
          icon={<Car className="h-5 w-5" />}
          tone="brand"
          label="Active Jobs"
          value={String(active.length)}
          detail={`${jobs.length} total recorded`}
        />
        {canViewFinancials && (
          <Metric
            icon={<IndianRupee className="h-5 w-5" />}
            tone="emerald"
            label="Pipeline Revenue"
            value={formatCurrency(revenue)}
            detail="Across all recorded jobs"
          />
        )}
        <Metric
          icon={<Timer className="h-5 w-5" />}
          tone="sky"
          label="Avg Turnaround"
          value={`${avgTurnaround.toFixed(0)}h`}
          detail={`Across ${delivered.length} completed vehicle${delivered.length === 1 ? '' : 's'}`}
        />
        <Metric
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
          label="Completed Vehicles"
          value={String(delivered.length)}
          detail="Retained in vehicle history"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* pipeline */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between p-5 pb-3">
            <h3 className="font-bold">Service Pipeline</h3>
            <span className="text-xs text-ink-400">{jobs.length} vehicles</span>
          </div>
          <div className="space-y-3 p-5 pt-2">
            {byStage.map(({ stage, count }) => (
              <div key={stage.id} className="flex items-center gap-3">
                <div className={cn('w-28 shrink-0 rounded-md px-2 py-1 text-sm font-semibold', PIPELINE_TONE[stage.id].label)}>
                  {stage.label}
                </div>
                <div className="h-7 flex-1 overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                  <div
                    className={cn(
                      'flex h-full items-center justify-end rounded-lg px-2 text-xs font-bold text-white transition-all',
                      count === 0 ? 'bg-transparent text-ink-400' : PIPELINE_TONE[stage.id].bar,
                    )}
                    style={{ width: `${Math.max((count / maxCount) * 100, count ? 12 : 0)}%` }}
                  >
                    {count > 0 && count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* bottleneck */}
        <Card>
          <div className="p-5 pb-3">
            <h3 className="font-bold">Bottleneck Alert</h3>
          </div>
          <div className="p-5 pt-0">
            <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/40">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
                <p className="font-bold">{active.length === 0 ? 'No active bottleneck' : bottleneck.stage.label}</p>
              </div>
              <p className="mt-1 text-sm text-amber-700/80 dark:text-amber-300/80">
                {active.length === 0
                  ? 'All recorded vehicles have completed the workshop workflow.'
                  : `${bottleneck.count} vehicles currently queued here — the busiest stage on the floor.`}
              </p>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">
                Staff Utilisation
              </p>
              <div className="space-y-2">
                {staff.slice(0, 4).map((st) => (
                  <div key={st.id} className="flex items-center gap-2">
                    <Avatar name={st.name} color={st.avatarColor} size="sm" />
                    <span className="flex-1 truncate text-sm">{st.name}</span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${st.efficiency}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-semibold text-ink-500">
                      {st.efficiency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* recent jobs */}
      <Card className="mt-6 border-l-4 border-l-brand-500">
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="font-bold text-brand-600 dark:text-brand-400">Active Jobs</h3>
        </div>
        <div className="divide-y divide-ink-100 dark:divide-ink-800">
          {active.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-ink-400">No active jobs.</p>
          )}
          {active.slice(0, 6).map((j) => {
            const cust = customerById(customers, j.customerId);
            const assignee = staffById(staff, j.assignedStaffId);
            return (
              <button
                key={j.id}
                onClick={() => setActiveJob(j.id)}
                className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-ink-50 dark:hover:bg-ink-800/50"
              >
                <span className="rounded-lg bg-ink-900 px-2 py-1 font-mono text-[11px] font-bold text-white dark:bg-brand-600">
                  {j.vehicleNo}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {j.make} {j.model}
                  </p>
                  <p className="truncate text-xs text-ink-400">{cust?.name}</p>
                </div>
                <div className="hidden w-40 shrink-0 md:block">
                  <StageProgress current={j.currentStage} showLabels={false} />
                </div>
                <StageBadge stage={j.currentStage} />
                {assignee ? (
                  <Avatar name={assignee.name} color={assignee.avatarColor} size="sm" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950">
                    <Wrench className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="mt-6 border-l-4 border-l-emerald-500">
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="font-bold text-emerald-600 dark:text-emerald-400">
            Completed Vehicles
          </h3>
          <span className="text-xs text-ink-400">{delivered.length} delivered</span>
        </div>
        <div className="divide-y divide-ink-100 dark:divide-ink-800">
          {delivered.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-ink-400">No completed vehicles yet.</p>
          )}
          {delivered.map((job) => {
            const customer = customerById(customers, job.customerId);
            const completedAt = [...job.stageHistory].reverse().find((item) => item.stage === 'delivered')?.at;
            return (
              <button
                key={job.id}
                onClick={() => setActiveJob(job.id)}
                className="grid w-full gap-3 px-5 py-4 text-left hover:bg-ink-50 dark:hover:bg-ink-800/50 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"
              >
                <span className="w-fit rounded-lg bg-ink-900 px-2 py-1 font-mono text-[11px] font-bold text-white dark:bg-brand-600">
                  {job.vehicleNo}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{job.make} {job.model}</p>
                  <p className="truncate text-xs text-ink-400">{customer?.name ?? 'Customer'} · Job {job.id}</p>
                </div>
                <div className="text-xs text-ink-400">
                  <p>Completed</p>
                  <p className="font-medium text-ink-600 dark:text-ink-300">{completedAt ? formatDate(completedAt) : 'Date unavailable'}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm font-bold">{formatCurrency(jobTotal(job))}</p>
                  <StageBadge stage={job.currentStage} />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <JobDetailDrawer jobId={activeJobId} onClose={() => setActiveJob(null)} onPrint={onPrint} />
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'brand' | 'emerald' | 'sky' | 'amber';
  detail: string;
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  };
  const borders = {
    brand: 'border-l-4 border-l-brand-500',
    emerald: 'border-l-4 border-l-emerald-500',
    sky: 'border-l-4 border-l-sky-500',
    amber: 'border-l-4 border-l-amber-500',
  };
  return (
    <Card className={cn('p-5', borders[tone])}>
      <div className="flex items-center justify-between">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tones[tone])}>
          {icon}
        </span>
      </div>
      <p className="mt-4 text-2xl font-extrabold tracking-tight">{value}</p>
      <p className={cn('text-sm font-semibold', tones[tone].split(' ').filter((part) => part.startsWith('text-') || part.startsWith('dark:text-')).join(' '))}>{label}</p>
      <p className="mt-1 text-[11px] text-ink-400">{detail}</p>
    </Card>
  );
}
