import {
  ShieldCheck,
  CreditCard,
  DoorOpen,
  Send,
  Check,
  X,
  PackageCheck,
  MessageCircle,
  Truck,
  Lock,
} from 'lucide-react';
import { useStore, customerById } from '@/store/useStore';
import { PageHeader } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { StageBadge } from '@/components/shared/StatusPill';
import { serviceById } from '@/lib/workflows';
import { pendingPartsTotal, jobTotal } from '@/lib/jobUtils';
import { formatCurrency } from '@/lib/utils';
import type { JobCard } from '@/types';

const WA_GROUP = '910000000000'; // mock parts-supplier WhatsApp group

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------
export function Billing() {
  const jobs = useStore((s) => s.jobs);

  const billable = jobs.filter((j) => j.currentStage === 'billing' || j.currentStage === 'delivered');
  const awaitingPayment = billable.filter((j) => !j.paid).length;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <PageHeader
        title="Billing & Gate Pass"
        subtitle={`${awaitingPayment} awaiting payment`}
      />
      {billable.length === 0 ? (
        <Card className="p-10 text-center text-ink-400">No vehicles in billing yet.</Card>
      ) : (
        <div className="space-y-5">
          {billable.map((j) => (
            <BillingCard key={j.id} job={j} />
          ))}
        </div>
      )}
    </div>
  );
}

function BillingCard({ job }: { job: JobCard }) {
  const customers = useStore((s) => s.customers);
  const markPaid = useStore((s) => s.markPaid);
  const issueGatePass = useStore((s) => s.issueGatePass);
  const pushNotification = useStore((s) => s.pushNotification);

  const cust = customerById(customers, job.customerId);
  const installedParts = job.parts.filter((p) => p.approved === true);
  const total = jobTotal(job);

  const invoiceText = encodeURIComponent(
    `GarageHub invoice for ${job.vehicleNo} (${job.make} ${job.model}) — Job ${job.id}. Total ${formatCurrency(total)}. Your vehicle is ready.`,
  );
  const wa = `https://wa.me/${(cust?.phone ?? '').replace(/[^\d]/g, '')}?text=${invoiceText}`;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between bg-gradient-to-r from-ink-900 to-ink-800 px-5 py-3 text-white dark:from-brand-800 dark:to-brand-900">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold">{job.vehicleNo}</span>
          <span className="text-xs opacity-80">
            {job.make} {job.model}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StageBadge stage={job.currentStage} />
          <span className="font-mono text-[11px] opacity-70">{job.id}</span>
        </div>
      </div>

      <div className="p-5">
        {/* itemized */}
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Labour</p>
        <div className="space-y-1 text-sm">
          {job.serviceIds.map((id) => (
            <div key={id} className="flex justify-between">
              <span>{serviceById(id)?.name}</span>
              <span className="font-medium">{formatCurrency(serviceById(id)?.price ?? 0)}</span>
            </div>
          ))}
        </div>

        <p className="mb-2 mt-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">
          <PackageCheck className="h-3.5 w-3.5" /> Parts installed
        </p>
        {installedParts.length === 0 ? (
          <p className="text-sm text-ink-400">No chargeable parts.</p>
        ) : (
          <div className="space-y-1 text-sm">
            {installedParts.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span>
                  {p.name} <span className="text-ink-400">×{p.quantity}</span>
                </span>
                <span className="font-medium">{formatCurrency(p.price * p.quantity)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-lg font-extrabold dark:border-ink-800">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>

        {job.insuranceClaim && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-950/40">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Insurance: {job.insuranceClaim.provider} · {job.insuranceClaim.claimNo}
          </div>
        )}

        {/* payment */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Payment mode</label>
            <Select
              value={job.paymentMode ?? ''}
              onChange={(e) => markPaid(job.id, e.target.value as JobCard['paymentMode'])}
              disabled={job.paid}
            >
              <option value="">Select…</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
            </Select>
          </div>
          <div className="flex items-end">
            {job.paid ? (
              <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Check className="h-4 w-4" /> Paid{job.paymentMode ? ` · ${job.paymentMode.toUpperCase()}` : ''}
              </div>
            ) : (
              <Button className="w-full" onClick={() => markPaid(job.id, job.paymentMode ?? 'cash')}>
                <CreditCard className="h-4 w-4" /> Mark Paid
              </Button>
            )}
          </div>
        </div>

        {/* actions */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={wa} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="w-full">
              <Send className="h-3.5 w-3.5" /> Send invoice
            </Button>
          </a>
          <Button
            size="sm"
            variant={job.gatePassIssued ? 'success' : 'primary'}
            disabled={!job.paid || job.gatePassIssued}
            onClick={() => issueGatePass(job.id)}
          >
            {job.gatePassIssued ? (
              <>
                <DoorOpen className="h-3.5 w-3.5" /> Gate pass issued
              </>
            ) : !job.paid ? (
              <>
                <Lock className="h-3.5 w-3.5" /> Gate pass (pay first)
              </>
            ) : (
              <>
                <DoorOpen className="h-3.5 w-3.5" /> Issue gate pass
              </>
            )}
          </Button>
        </div>

        {/* drop-off notify */}
        {job.gatePassIssued && job.pickupDrop && (job.pickupDrop.type === 'drop' || job.pickupDrop.type === 'both') && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-2 w-full"
            onClick={() =>
              pushNotification(job.id, {
                channel: 'sms',
                to: 'customer',
                message: 'Your vehicle has left the workshop for drop-off.',
              })
            }
          >
            <Truck className="h-3.5 w-3.5" /> Notify customer: vehicle left for drop-off
          </Button>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Parts approvals
// ---------------------------------------------------------------------------
export function PartsApprovals() {
  const jobs = useStore((s) => s.jobs);
  const customers = useStore((s) => s.customers);
  const reviewPart = useStore((s) => s.reviewPart);

  const jobsWithPending = jobs.filter((j) => j.parts.some((p) => p.approved === null));

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <PageHeader
        title="Parts Approvals"
        subtitle="Approve technician part requests · raise supplier enquiries"
      />
      {jobsWithPending.length === 0 ? (
        <Card className="p-10 text-center text-ink-400">No parts awaiting approval.</Card>
      ) : (
        <div className="space-y-4">
          {jobsWithPending.map((job) => {
            const cust = customerById(customers, job.customerId);
            return (
              <Card key={job.id} className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-md bg-ink-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white dark:bg-brand-600">
                    {job.vehicleNo}
                  </span>
                  <span className="text-sm font-semibold">
                    {job.make} {job.model}
                  </span>
                  <span className="text-xs text-ink-400">· {cust?.name}</span>
                  <StageBadge stage={job.currentStage} />
                </div>
                <ul className="space-y-2">
                  {job.parts
                    .filter((p) => p.approved === null)
                    .map((p) => {
                      const enquiry = encodeURIComponent(
                        `Parts enquiry for ${job.make} ${job.model} (${job.vehicleNo}): ${p.quantity}× ${p.name}. Please confirm availability & price.`,
                      );
                      return (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-200/70 p-3 dark:border-ink-800"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">
                              {p.name} <span className="text-ink-400">×{p.quantity}</span>
                            </p>
                            <p className="text-xs text-ink-400">{formatCurrency(p.price * p.quantity)}</p>
                          </div>
                          {p.inStock === false && (
                            <a
                              href={`https://wa.me/${WA_GROUP}?text=${enquiry}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Badge tone="amber" className="cursor-pointer">
                                <MessageCircle className="h-3 w-3" /> Out of stock · enquire
                              </Badge>
                            </a>
                          )}
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="success" onClick={() => reviewPart(job.id, p.id, true)}>
                              <Check className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => reviewPart(job.id, p.id, false)}>
                              <X className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                </ul>
                {pendingPartsTotal(job) > 0 && (
                  <p className="mt-3 text-right text-sm text-ink-500">
                    Pending value:{' '}
                    <span className="font-bold text-amber-600">{formatCurrency(pendingPartsTotal(job))}</span>
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
