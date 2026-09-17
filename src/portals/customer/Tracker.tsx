import { useEffect } from 'react';
import { Car, Clock, MapPin, Wrench, CheckCircle2, Phone, Camera, Bell, DoorOpen } from 'lucide-react';
import { useStore, staffById, customerById } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { StageProgress } from '@/components/shared/StageProgress';
import { PhotoGallery } from '@/components/shared/PhotoGallery';
import { StageBadge } from '@/components/shared/StatusPill';
import { serviceById, stageLabel, nextStage, STAGES, PENDING_WORK_META } from '@/lib/workflows';
import { cn, formatDateTime, timeFromNow } from '@/lib/utils';

export function Tracker() {
  const user = useAuthStore((s) => s.user);
  const jobs = useStore((s) => s.jobs);
  const customers = useStore((s) => s.customers);
  const staff = useStore((s) => s.staff);
  const activeCustomerId = useStore((s) => s.activeCustomerId);
  const setActiveCustomer = useStore((s) => s.setActiveCustomer);

  // Only customers that actually have a job, for a realistic demo switcher.
  const customersWithJobs = customers.filter((c) => jobs.some((j) => j.customerId === c.id));

  useEffect(() => {
    if (!jobs.some((j) => j.customerId === activeCustomerId) && customersWithJobs[0]) {
      setActiveCustomer(customersWithJobs[0].id);
    }
  }, [activeCustomerId, customersWithJobs, jobs, setActiveCustomer]);

  const myJobs = jobs.filter((j) => j.customerId === activeCustomerId);
  const me = customerById(customers, activeCustomerId);

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24">
      {/* customer switcher (demo) */}
      <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-thin pb-1">
        {customersWithJobs.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCustomer(c.id)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              activeCustomerId === c.id
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                : 'border-ink-200 dark:border-ink-700',
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <p className="text-sm text-ink-400">Welcome back,</p>
        <h1 className="text-2xl font-extrabold tracking-tight">{me?.name ?? user?.name ?? 'Customer'}</h1>
      </div>

      {myJobs.length === 0 ? (
        <Card className="p-10 text-center text-ink-400">No active vehicles.</Card>
      ) : (
        <div className="space-y-5">
          {myJobs.map((job) => {
            const assignee = staffById(staff, job.assignedStaffId);
            const nxt = nextStage(job.currentStage);
            const delivered = job.currentStage === 'delivered';
            return (
              <Card key={job.id} className="overflow-hidden">
                {/* hero */}
                <div
                  className={cn(
                    'p-5 text-white',
                    delivered
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                      : 'bg-gradient-to-br from-brand-600 to-brand-800',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      <span className="font-bold">
                        {job.make} {job.model}
                      </span>
                    </div>
                    <span className="font-mono text-xs opacity-80">{job.vehicleNo}</span>
                  </div>
                  <p className="mt-4 text-sm opacity-80">
                    {delivered ? 'Delivered' : 'Currently'}
                  </p>
                  <p className="text-2xl font-extrabold">{stageLabel(job.currentStage)}</p>
                  {!delivered && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm opacity-90">
                      <Clock className="h-4 w-4" />
                      Est. ready {timeFromNow(job.estimatedDelivery)}
                    </p>
                  )}
                </div>

                {/* body */}
                <div className="p-5">
                  <StageProgress current={job.currentStage} variant="vertical" />

                  {/* mechanic */}
                  {assignee && !delivered && (
                    <div className="mt-2 flex items-center gap-3 rounded-2xl bg-ink-50 p-3 dark:bg-ink-800/60">
                      <Avatar name={assignee.name} color={assignee.avatarColor} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{assignee.name}</p>
                        <p className="text-xs capitalize text-ink-400">
                          <Wrench className="mr-1 inline h-3 w-3" />
                          {assignee.role} · handling your car
                        </p>
                      </div>
                      <a
                        href="tel:+912240001234"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    </div>
                  )}

                  {/* services */}
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">
                      Your Services
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.serviceIds.map((id) => (
                        <Badge key={id} tone="blue">
                          {serviceById(id)?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* milestone photos */}
                  {job.photos.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">
                        <Camera className="h-3.5 w-3.5" /> Progress Photos
                      </p>
                      <PhotoGallery photos={job.photos} />
                    </div>
                  )}

                  {/* pickup/drop */}
                  {job.pickupDrop && (
                    <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-ink-200 p-3 text-sm dark:border-ink-700">
                      <MapPin className="h-4 w-4 text-ink-400" />
                      <span className="capitalize">{job.pickupDrop.type}</span>
                      <span className="text-ink-400">·</span>
                      <span className="text-ink-500">{formatDateTime(job.pickupDrop.scheduledAt)}</span>
                      <StageBadge stage={job.currentStage} />
                    </div>
                  )}

                  {/* pending final jobs */}
                  {job.pendingWork && job.pendingWork.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-ink-400">Finishing up:</span>
                      {job.pendingWork.map((k) => (
                        <Badge key={k} tone="amber">
                          {PENDING_WORK_META[k]?.label ?? k} pending
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* gate pass */}
                  {(job.currentStage === 'billing' || delivered) && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-800/60">
                      <DoorOpen className="h-4 w-4 text-ink-400" />
                      {job.gatePassIssued ? (
                        <span className="font-medium text-emerald-600">Gate pass issued — cleared to leave</span>
                      ) : job.paid ? (
                        <span className="text-amber-600">Paid · gate pass being issued</span>
                      ) : (
                        <span className="text-ink-500">Complete payment to receive the gate pass</span>
                      )}
                    </div>
                  )}

                  {/* notifications timeline */}
                  {job.notifications && job.notifications.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">
                        <Bell className="h-3.5 w-3.5" /> Updates
                      </p>
                      <ul className="space-y-2">
                        {[...job.notifications].reverse().slice(0, 5).map((n) => (
                          <li key={n.id} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                            <div>
                              <p>{n.message}</p>
                              <p className="text-[11px] text-ink-400">{formatDateTime(n.at)}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {nxt && !delivered && (
                    <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Next up: {stageLabel(nxt)}
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* legend footer */}
      <p className="mt-6 text-center text-[11px] text-ink-400">
        Live status updates automatically · {STAGES.length} stages tracked
      </p>
    </div>
  );
}
