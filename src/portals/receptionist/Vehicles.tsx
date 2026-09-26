import { useState } from 'react';
import { Car, Search, History, Clock, ChevronRight, Gauge, User, Wrench } from 'lucide-react';
import { useStore, customerById, staffById } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { PageHeader } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { StageBadge } from '@/components/shared/StatusPill';
import { JobDetailDrawer } from '@/components/shared/JobDetailDrawer';
import { buildVehicleRegistry } from '@/lib/vehicles';
import { serviceById } from '@/lib/workflows';
import { jobTotal } from '@/lib/jobUtils';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

export function Vehicles({ onPrint }: { onPrint: (id: string) => void }) {
  const canViewFinancials = useAuthStore((s) => ['admin', 'owner', 'accountant'].includes(s.user?.role ?? ''));
  const jobs = useStore((s) => s.jobs);
  const customers = useStore((s) => s.customers);
  const staff = useStore((s) => s.staff);
  const activeJobId = useStore((s) => s.activeJobId);
  const setActiveJob = useStore((s) => s.setActiveJob);
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const registry = buildVehicleRegistry(jobs);
  const query = q.trim().toUpperCase().replace(/\s+/g, '');
  const filtered = query
    ? registry.filter(
        (v) =>
          v.vehicleNo.includes(query) ||
          `${v.make} ${v.model}`.toUpperCase().includes(query),
      )
    : registry;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <PageHeader
        title="Vehicle History"
        subtitle={`${registry.length} vehicles on record`}
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search registration or model…"
              className="h-10 w-64 rounded-xl border border-ink-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900"
            />
          </div>
        }
      />

      <div className="space-y-3">
        {filtered.map((v) => {
          const cust = customerById(customers, v.customerId);
          const open = expanded === v.vehicleNo;
          return (
            <Card key={v.vehicleNo} className="overflow-hidden">
              <button
                onClick={() => setExpanded(open ? null : v.vehicleNo)}
                className="flex w-full items-center gap-4 p-4 text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                  <Car className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-ink-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white dark:bg-brand-600">
                      {v.vehicleNo}
                    </span>
                    <span className="truncate font-bold">
                      {v.make} {v.model}
                    </span>
                    <span className="text-xs text-ink-400">· {v.year}</span>
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-400">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {cust?.name ?? 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Gauge className="h-3 w-3" />
                      {v.lastOdometer.toLocaleString()} km
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last visit {formatDate(v.lastVisitAt)}
                    </span>
                  </p>
                </div>
                {v.mechanicIds.length > 0 && (
                  <div className="hidden items-center sm:flex" title="Serviced by">
                    <div className="flex -space-x-2">
                      {v.mechanicIds.slice(0, 3).map((id) => {
                        const m = staffById(staff, id);
                        return m ? <Avatar key={id} name={m.name} color={m.avatarColor} size="sm" /> : null;
                      })}
                    </div>
                    {v.mechanicIds.length > 3 && (
                      <span className="ml-1 text-[11px] font-semibold text-ink-400">
                        +{v.mechanicIds.length - 3}
                      </span>
                    )}
                  </div>
                )}
                <Badge tone="blue">
                  <History className="h-3 w-3" /> {v.visits} visit{v.visits > 1 ? 's' : ''}
                </Badge>
                <ChevronRight
                  className={cn('h-5 w-5 shrink-0 text-ink-400 transition-transform', open && 'rotate-90')}
                />
              </button>

              {open && (
                <div className="border-t border-ink-100 dark:border-ink-800">
                  {/* full vehicle summary */}
                  <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail label="Owner" value={cust?.name ?? 'Unknown'} sub={cust?.phone} />
                    {canViewFinancials && (
                      <Detail
                        label="Lifetime spend"
                        value={formatCurrency(v.jobs.reduce((s, j) => s + jobTotal(j), 0))}
                        sub={`${v.visits} visit${v.visits > 1 ? 's' : ''}`}
                      />
                    )}
                    <Detail
                      label="First / last visit"
                      value={formatDate(v.firstVisitAt)}
                      sub={`Last ${formatDate(v.lastVisitAt)}`}
                    />
                    <Detail
                      label="Vehicle"
                      value={`${v.color}`}
                      sub={`${v.year} · ${v.lastOdometer.toLocaleString()} km`}
                    />
                  </div>

                  {cust?.address && (
                    <p className="flex items-start gap-1.5 px-4 pb-1 text-xs text-ink-400">
                      <User className="mt-0.5 h-3 w-3 shrink-0" /> {cust.address}
                    </p>
                  )}

                  {v.mechanicIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 px-4 pb-2 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                        Serviced by
                      </span>
                      {v.mechanicIds.map((id) => {
                        const m = staffById(staff, id);
                        return m ? (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 py-0.5 pl-0.5 pr-2 dark:bg-ink-800/60"
                          >
                            <Avatar name={m.name} color={m.avatarColor} size="sm" />
                            <span className="text-xs font-medium">{m.name}</span>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}

                  <p className="px-4 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                    Service history
                  </p>
                  <div className="divide-y divide-ink-100 dark:divide-ink-800">
                    {v.jobs.map((j) => {
                      const mech = staffById(staff, j.assignedStaffId);
                      return (
                        <button
                          key={j.id}
                          onClick={() => setActiveJob(j.id)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-ink-50 dark:hover:bg-ink-800/50"
                        >
                          <span className="font-mono text-[11px] font-bold text-ink-500">{j.id}</span>
                          <span className="w-16 shrink-0 text-xs text-ink-400">
                            {formatDate(j.createdAt)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {j.serviceIds.map((id) => serviceById(id)?.name).filter(Boolean).join(', ')}
                          </span>
                          <span className="hidden items-center gap-1.5 sm:flex" title="Worked by">
                            {mech ? (
                              <>
                                <Avatar name={mech.name} color={mech.avatarColor} size="sm" />
                                <span className="w-20 truncate text-xs text-ink-500">{mech.name}</span>
                              </>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <Wrench className="h-3 w-3" /> Unassigned
                              </span>
                            )}
                          </span>
                          <span className="hidden text-sm font-semibold md:block">
                            {formatCurrency(jobTotal(j))}
                          </span>
                          <StageBadge stage={j.currentStage} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Card className="p-10 text-center text-ink-400">
            No vehicles match “{q}”.
          </Card>
        )}
      </div>

      <JobDetailDrawer jobId={activeJobId} onClose={() => setActiveJob(null)} onPrint={onPrint} />
    </div>
  );
}

function Detail({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3 dark:bg-ink-800/60">
      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold">{value}</p>
      {sub && <p className="truncate text-[11px] text-ink-400">{sub}</p>}
    </div>
  );
}
