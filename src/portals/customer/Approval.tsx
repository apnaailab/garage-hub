import { Check, X, Receipt, CreditCard, ShieldCheck, AlertCircle, CalendarClock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { serviceById } from '@/lib/workflows';
import { servicesTotal, approvedPartsTotal, pendingPartsTotal, jobTotal } from '@/lib/jobUtils';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';
import type { JobCard } from '@/types';

export function Approval() {
  const jobs = useStore((s) => s.jobs);
  const customers = useStore((s) => s.customers);
  const activeCustomerId = useStore((s) => s.activeCustomerId);
  const setActiveCustomer = useStore((s) => s.setActiveCustomer);

  const customersWithJobs = customers.filter((c) => jobs.some((j) => j.customerId === c.id));
  const myJobs = jobs.filter((j) => j.customerId === activeCustomerId);

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24">
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

      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Approvals &amp; Invoices</h1>

      {myJobs.length === 0 ? (
        <Card className="p-10 text-center text-ink-400">Nothing to review right now.</Card>
      ) : (
        <div className="space-y-5">
          {myJobs.map((job) => (
            <InvoiceCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

function InvoiceCard({ job }: { job: JobCard }) {
  const approveExtraWork = useStore((s) => s.approveExtraWork);
  const reviewPart = useStore((s) => s.reviewPart);
  const markPaid = useStore((s) => s.markPaid);

  const pendingParts = job.parts.filter((p) => p.approved === null);
  const needsApproval = pendingParts.length > 0;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between bg-gradient-to-r from-ink-900 to-ink-800 px-5 py-3 text-white dark:from-brand-800 dark:to-brand-900">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          <span className="font-mono text-sm font-bold">{job.id}</span>
        </div>
        <span className="text-xs opacity-80">
          {job.make} {job.model} · {job.vehicleNo}
        </span>
      </div>

      <div className="p-5">
        {/* extra work approval */}
        {needsApproval && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-5 w-5" />
              <p className="font-bold">Extra work needs your approval</p>
            </div>
            <ul className="mt-3 space-y-2">
              {pendingParts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm dark:bg-ink-900"
                >
                  <div>
                    <p className="font-medium">
                      {p.name} <span className="text-ink-400">×{p.quantity}</span>
                    </p>
                    <p className="text-xs text-ink-400">{formatCurrency(p.price * p.quantity)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="success" onClick={() => reviewPart(job.id, p.id, true)}>
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reviewPart(job.id, p.id, false)}>
                      <X className="h-3.5 w-3.5" /> Decline
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* itemized invoice */}
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Itemized Estimate</p>
        <div className="space-y-1.5 text-sm">
          {job.serviceIds.map((id) => {
            const svc = serviceById(id);
            return (
              <div key={id} className="flex justify-between">
                <span>{svc?.name}</span>
                <span className="font-medium">{formatCurrency(svc?.price ?? 0)}</span>
              </div>
            );
          })}
          {job.parts
            .filter((p) => p.approved === true)
            .map((p) => (
              <div key={p.id} className="flex justify-between text-ink-500">
                <span>
                  {p.name} ×{p.quantity}
                </span>
                <span className="font-medium">{formatCurrency(p.price * p.quantity)}</span>
              </div>
            ))}
        </div>

        <div className="mt-3 space-y-1 border-t border-ink-100 pt-3 text-sm dark:border-ink-800">
          <div className="flex justify-between text-ink-500">
            <span>Services</span>
            <span>{formatCurrency(servicesTotal(job))}</span>
          </div>
          <div className="flex justify-between text-ink-500">
            <span>Approved parts</span>
            <span>{formatCurrency(approvedPartsTotal(job))}</span>
          </div>
          {pendingPartsTotal(job) > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>Pending approval</span>
              <span>{formatCurrency(pendingPartsTotal(job))}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1 text-lg font-extrabold">
            <span>Total Due</span>
            <span>{formatCurrency(jobTotal(job))}</span>
          </div>
        </div>

        {/* insurance */}
        {job.insuranceClaim && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-950/40">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>
              Covered by <strong>{job.insuranceClaim.provider}</strong> — claim{' '}
              {job.insuranceClaim.claimNo}
            </span>
          </div>
        )}

        {/* pickup schedule */}
        {job.pickupDrop && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-800/60">
            <CalendarClock className="h-4 w-4 text-ink-400" />
            <span className="capitalize">{job.pickupDrop.type}</span> scheduled ·{' '}
            {formatDateTime(job.pickupDrop.scheduledAt)}
          </div>
        )}

        {/* payment */}
        <div className="mt-5">
          {job.paid ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Check className="h-5 w-5" /> Payment received — thank you!
            </div>
          ) : (
            <div className="flex gap-2">
              {job.extraWorkApproved === null && (
                <Button variant="outline" className="flex-1" onClick={() => approveExtraWork(job.id, true)}>
                  Approve estimate
                </Button>
              )}
              <Button className="flex-1" onClick={() => markPaid(job.id)}>
                <CreditCard className="h-4 w-4" /> Pay {formatCurrency(jobTotal(job))}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-center">
          <Badge tone={job.paid ? 'green' : 'amber'}>
            {job.paid ? 'Paid' : 'Payment pending'}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
