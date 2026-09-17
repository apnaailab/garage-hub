import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Wrench } from 'lucide-react';
import { useStore, customerById, staffById } from '@/store/useStore';
import { serviceById, stageLabel } from '@/lib/workflows';
import { servicesTotal } from '@/lib/jobUtils';
import { DamageDiagram } from '@/components/shared/DamageDiagram';
import { formatCurrency, formatDateTime } from '@/lib/utils';

/**
 * Renders a print-ready job card into #print-area and triggers the browser
 * print dialog. On completion it calls onDone to clear the print state.
 */
export function PrintJobCard({ jobId, onDone }: { jobId: string; onDone: () => void }) {
  const job = useStore((s) => s.jobs.find((j) => j.id === jobId));
  const customers = useStore((s) => s.customers);
  const staff = useStore((s) => s.staff);

  useEffect(() => {
    if (!job) return;
    const t = setTimeout(() => {
      window.print();
      onDone();
    }, 150);
    return () => clearTimeout(t);
  }, [job, onDone]);

  if (!job) return null;
  const customer = customerById(customers, job.customerId);
  const assignee = staffById(staff, job.assignedStaffId);

  return (
    <div id="print-area" className="mx-auto max-w-3xl bg-white p-8 text-ink-900">
      {/* letterhead */}
      <div className="flex items-center justify-between border-b-2 border-ink-900 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-900 text-white">
            <Wrench className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">GarageHub</h1>
            <p className="text-xs text-ink-500">Auto Service &amp; Bodyshop · 022-4000-1234</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-ink-400">Job Card</p>
          <p className="font-mono text-xl font-extrabold">{job.id}</p>
          <p className="text-xs text-ink-500">{formatDateTime(job.createdAt)}</p>
        </div>
      </div>

      {/* vehicle + customer + qr */}
      <div className="mt-6 grid grid-cols-3 gap-6">
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <Block label="Registration">
            <span className="font-mono text-lg font-bold">{job.vehicleNo}</span>
          </Block>
          <Block label="Vehicle">
            {job.make} {job.model} · {job.year}
          </Block>
          <Block label="Colour">{job.color}</Block>
          <Block label="Odometer">{job.odometer.toLocaleString()} km</Block>
          <Block label="Fuel Level">{job.fuelLevel}</Block>
          <Block label="Priority" className="capitalize">
            {job.priority}
          </Block>
          <Block label="Customer">{customer?.name}</Block>
          <Block label="Phone">{customer?.phone}</Block>
          <Block label="Assigned To">{assignee?.name ?? 'To be assigned'}</Block>
          <Block label="Est. Delivery">{formatDateTime(job.estimatedDelivery)}</Block>
        </div>
        <div className="flex flex-col items-center justify-start">
          <QRCodeSVG value={`garagehub://job/${job.id}`} size={120} />
          <p className="mt-2 text-center text-[10px] text-ink-400">
            Scan to look up this job
          </p>
        </div>
      </div>

      {/* services */}
      <div className="mt-6">
        <h2 className="mb-2 border-b border-ink-200 pb-1 text-sm font-bold uppercase tracking-wide">
          Services Requested
        </h2>
        <table className="w-full text-sm">
          <tbody>
            {job.serviceIds.map((id) => {
              const svc = serviceById(id);
              return (
                <tr key={id} className="border-b border-ink-100">
                  <td className="py-1.5">{svc?.name}</td>
                  <td className="py-1.5 text-right font-medium">{formatCurrency(svc?.price ?? 0)}</td>
                </tr>
              );
            })}
            <tr>
              <td className="py-2 font-bold">Estimated Total</td>
              <td className="py-2 text-right text-lg font-extrabold">
                {formatCurrency(servicesTotal(job))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* damage + insurance */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="mb-2 border-b border-ink-200 pb-1 text-sm font-bold uppercase tracking-wide">
            Damage Report
          </h2>
          {job.damageMarkers.length > 0 ? (
            <DamageDiagram markers={job.damageMarkers} />
          ) : (
            <p className="text-sm text-ink-400">No damage recorded at intake.</p>
          )}
        </div>
        <div>
          <h2 className="mb-2 border-b border-ink-200 pb-1 text-sm font-bold uppercase tracking-wide">
            Status &amp; Notes
          </h2>
          <p className="text-sm">
            Current stage: <strong>{stageLabel(job.currentStage)}</strong>
          </p>
          {job.insuranceClaim && (
            <p className="mt-2 text-sm">
              Insurance: <strong>{job.insuranceClaim.provider}</strong> ·{' '}
              {job.insuranceClaim.claimNo}
            </p>
          )}
          <ul className="mt-2 list-disc pl-4 text-sm text-ink-600">
            {job.notes.map((n) => (
              <li key={n.id}>{n.text}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* signatures */}
      <div className="mt-10 grid grid-cols-2 gap-10 text-sm">
        <Signature label="Customer Signature" />
        <Signature label="Service Advisor" />
      </div>

      <p className="mt-8 text-center text-[10px] text-ink-400">
        This is a computer-generated job card. Estimates are subject to inspection. Thank you for
        choosing GarageHub.
      </p>
    </div>
  );
}

function Block({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`text-sm font-medium ${className ?? ''}`}>{children}</p>
    </div>
  );
}

function Signature({ label }: { label: string }) {
  return (
    <div>
      <div className="mt-8 border-t border-ink-400" />
      <p className="mt-1 text-xs text-ink-500">{label}</p>
    </div>
  );
}
