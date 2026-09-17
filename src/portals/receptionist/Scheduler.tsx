import { Truck, MapPin, Clock, User, ArrowRight, CheckCircle2, Navigation } from 'lucide-react';
import { useStore, customerById, staffById } from '@/store/useStore';
import { PageHeader } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { cn, formatDateTime } from '@/lib/utils';
import type { JobCard } from '@/types';

type PickupStatus = NonNullable<JobCard['pickupDrop']>['status'];

const STATUS_META: Record<PickupStatus, { tone: Parameters<typeof Badge>[0]['tone']; label: string; icon: typeof Truck }> = {
  scheduled: { tone: 'amber', label: 'Scheduled', icon: Clock },
  'en-route': { tone: 'blue', label: 'En Route', icon: Navigation },
  completed: { tone: 'green', label: 'Completed', icon: CheckCircle2 },
};

const NEXT_STATUS: Record<PickupStatus, PickupStatus | null> = {
  scheduled: 'en-route',
  'en-route': 'completed',
  completed: null,
};

export function Scheduler() {
  const jobs = useStore((s) => s.jobs);
  const customers = useStore((s) => s.customers);
  const staff = useStore((s) => s.staff);
  const updatePickup = useStore((s) => s.updatePickup);

  const routes = jobs.filter((j) => j.pickupDrop);
  const drivers = staff.filter((s) => s.role === 'mechanic' || s.role === 'detailer');

  const counts = {
    scheduled: routes.filter((r) => r.pickupDrop!.status === 'scheduled').length,
    enroute: routes.filter((r) => r.pickupDrop!.status === 'en-route').length,
    completed: routes.filter((r) => r.pickupDrop!.status === 'completed').length,
  };

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader title="Pickup &amp; Drop Scheduler" subtitle="Manage driver routes and assignments" />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <SummaryCard tone="amber" label="Scheduled" value={counts.scheduled} icon={<Clock className="h-5 w-5" />} />
        <SummaryCard tone="blue" label="En Route" value={counts.enroute} icon={<Navigation className="h-5 w-5" />} />
        <SummaryCard tone="green" label="Completed" value={counts.completed} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <div className="space-y-4">
        {routes.map((job) => {
          const pd = job.pickupDrop!;
          const cust = customerById(customers, job.customerId);
          const driver = staffById(staff, pd.driverId);
          const meta = STATUS_META[pd.status];
          const Icon = meta.icon;
          const next = NEXT_STATUS[pd.status];

          return (
            <Card key={job.id} className="p-5">
              <div className="flex flex-wrap items-start gap-4">
                <span
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                    pd.type === 'pickup'
                      ? 'bg-sky-50 text-sky-600 dark:bg-sky-950'
                      : pd.type === 'drop'
                        ? 'bg-violet-50 text-violet-600 dark:bg-violet-950'
                        : 'bg-brand-50 text-brand-600 dark:bg-brand-950',
                  )}
                >
                  <Truck className="h-6 w-6" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold">{job.vehicleNo}</span>
                    <span className="text-sm text-ink-500">
                      {job.make} {job.model}
                    </span>
                    <Badge tone="gray" className="capitalize">
                      {pd.type}
                    </Badge>
                    <Badge tone={meta.tone}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </Badge>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-600 dark:text-ink-300">
                    <User className="h-3.5 w-3.5 text-ink-400" /> {cust?.name} · {cust?.phone}
                  </p>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-500">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" /> {pd.address}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-400">
                    <Clock className="h-3.5 w-3.5" /> {formatDateTime(pd.scheduledAt)}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-56">
                  <div className="flex items-center gap-2">
                    {driver && <Avatar name={driver.name} color={driver.avatarColor} size="sm" />}
                    <Select
                      value={pd.driverId ?? ''}
                      onChange={(e) => updatePickup(job.id, { driverId: e.target.value })}
                      className="h-9 flex-1 text-xs"
                    >
                      <option value="">Assign driver…</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {next && (
                    <Button
                      size="sm"
                      variant={next === 'completed' ? 'success' : 'primary'}
                      onClick={() => updatePickup(job.id, { status: next })}
                    >
                      Mark {STATUS_META[next].label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({
  tone,
  label,
  value,
  icon,
}: {
  tone: 'amber' | 'blue' | 'green';
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  const tones = {
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    blue: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  };
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tones[tone])}>
        {icon}
      </span>
      <div>
        <p className="text-xl font-extrabold">{value}</p>
        <p className="text-xs text-ink-400">{label}</p>
      </div>
    </Card>
  );
}
