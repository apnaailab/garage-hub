import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import {
  X,
  Printer,
  Fuel,
  Gauge,
  Phone,
  MapPin,
  Plus,
  Check,
  XCircle,
  Camera,
  DoorOpen,
  MessageCircle,
  Bell,
} from 'lucide-react';
import type { JobCard, PhotoTag, StageId } from '@/types';
import { useStore, staffById, customerById } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { StageProgress } from './StageProgress';
import { StageDetails } from './StageDetails';
import { PhotoGallery } from './PhotoGallery';
import { DamageDiagram } from './DamageDiagram';
import { StageBadge, PriorityBadge } from './StatusPill';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select, Input } from '@/components/ui/Input';
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { serviceById, nextStage, stageLabel, serviceStatusOf, SERVICE_STATUS_META, PENDING_WORK_META } from '@/lib/workflows';
import { jobTotal, servicesTotal, approvedPartsTotal } from '@/lib/jobUtils';
import { uploadImage } from '@/lib/images';
import { customerPortalApi } from '@/lib/api';

interface Props {
  jobId: string | null;
  onClose: () => void;
  onPrint?: (jobId: string) => void;
}

export function JobDetailDrawer({ jobId, onClose, onPrint }: Props) {
  const job = useStore((s) => s.jobs.find((j) => j.id === jobId));

  useEffect(() => {
    if (!jobId) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [jobId, onClose]);

  if (!jobId || !job) return null;

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-ink-50 shadow-2xl dark:bg-ink-950 animate-slide-up">
        <DrawerBody job={job} onClose={onClose} onPrint={onPrint} />
      </aside>
    </div>,
    document.body,
  );
}

function DrawerBody({ job, onClose, onPrint }: { job: JobCard; onClose: () => void; onPrint?: (id: string) => void }) {
  const userRole = useAuthStore((s) => s.user?.role);
  const canReviewParts = userRole === 'accountant';
  const canManagePortal = userRole === 'admin' || userRole === 'owner' || userRole === 'manager' || userRole === 'accountant';
  const staff = useStore((s) => s.staff);
  const customers = useStore((s) => s.customers);
  const setJobTrackingId = useStore((s) => s.setJobTrackingId);
  const advanceStage = useStore((s) => s.advanceStage);
  const assignStaff = useStore((s) => s.assignStaff);
  const reviewPart = useStore((s) => s.reviewPart);
  const addNote = useStore((s) => s.addNote);
  const addPhoto = useStore((s) => s.addPhoto);
  const togglePendingWork = useStore((s) => s.togglePendingWork);

  const [note, setNote] = useState('');
  const [selectedStage, setSelectedStage] = useState<StageId>(job.currentStage);
  const [portalError, setPortalError] = useState('');
  const [enablingPortal, setEnablingPortal] = useState(false);
  const assignee = staffById(staff, job.assignedStaffId);
  const customer = customerById(customers, job.customerId);
  const nxt = nextStage(job.currentStage);

  const addCapturedPhoto = async (tag: PhotoTag, file: File | undefined) => {
    if (!file) return;
    addPhoto(job.id, {
      url: await uploadImage(file, `job-${tag}`),
      tag,
      caption: `${stageLabel(job.currentStage)} snapshot`,
      uploadedBy: assignee?.name ?? 'Staff',
    });
  };

  const enablePortal = async () => {
    if (!customer?.phone) return;
    setEnablingPortal(true);
    setPortalError('');
    try {
      const credential = await customerPortalApi.issue(job.id, job.customerId, customer.phone);
      if (job.trackingId !== credential.trackingId) setJobTrackingId(job.id, credential.trackingId);
    } catch (error) {
      setPortalError(error instanceof Error ? error.message : 'Unable to enable customer tracking.');
    } finally {
      setEnablingPortal(false);
    }
  };

  const sharePortalLink = () => {
    if (!job.trackingId || !customer) return;
    const link = `${window.location.origin}/track`;
    const message = `Track your ${job.make} ${job.model} service at ${link}\nTracking ID: ${job.trackingId}\nUse the last 4 digits of your mobile number to open it.`;
    window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* header */}
      <header className="flex items-center justify-between border-b border-ink-200 bg-white px-5 py-4 dark:border-ink-800 dark:bg-ink-900">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-ink-900 px-2.5 py-1 font-mono text-sm font-bold text-white dark:bg-brand-600">
            {job.vehicleNo}
          </span>
          <div>
            <p className="font-bold leading-tight">
              {job.make} {job.model}
            </p>
            <p className="text-xs text-ink-400">
              {job.color} · {job.year} · {job.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onPrint?.(job.id)} title="Print job card">
            <Printer className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto scrollbar-thin p-5">
        {/* status + progress */}
        <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StageBadge stage={job.currentStage} />
              <PriorityBadge priority={job.priority} />
            </div>
            {nxt && (
              <Button size="sm" onClick={() => advanceStage(job.id)}>
                Move to {stageLabel(nxt)}
              </Button>
            )}
          </div>
          <StageProgress
            current={job.currentStage}
            selectedStage={selectedStage}
            onSelectStage={setSelectedStage}
          />
          <p className="mt-3 text-center text-[11px] text-ink-400">
            Tap a stage to see what happened there
          </p>
          <div className="mt-3">
            <StageDetails job={job} stage={selectedStage} />
          </div>
        </div>

        {/* vehicle facts */}
        <div className="grid grid-cols-2 gap-3">
          <Fact icon={<Fuel className="h-4 w-4" />} label="Fuel Level" value={job.fuelLevel} />
          <Fact icon={<Gauge className="h-4 w-4" />} label="Odometer" value={`${job.odometer.toLocaleString()} km`} />
        </div>

        {/* customer */}
        <Section title="Customer">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{customer?.name}</p>
              <p className="flex items-center gap-1 text-xs text-ink-400">
                <Phone className="h-3 w-3" /> {customer?.phone}
              </p>
              {customer?.address && (
                <p className="mt-1 flex items-start gap-1 text-xs text-ink-400">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {customer.address}
                </p>
              )}
            </div>
            {job.trackingId && <span className="shrink-0 font-mono text-xs font-bold text-ink-500">{job.trackingId}</span>}
          </div>
          {canManagePortal && customer?.phone && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
              {!job.trackingId && (
                <Button size="sm" variant="secondary" onClick={enablePortal} disabled={enablingPortal}>
                  {enablingPortal ? 'Enabling…' : 'Enable tracking'}
                </Button>
              )}
              {job.trackingId && (
                <Button size="sm" onClick={sharePortalLink}>
                  <MessageCircle className="h-4 w-4" /> Share on WhatsApp
                </Button>
              )}
              {portalError && <p className="w-full text-xs font-medium text-rose-600">{portalError}</p>}
            </div>
          )}
        </Section>

        {/* assignment */}
        <Section title="Assigned Mechanic">
          <div className="flex items-center gap-3">
            {assignee && <Avatar name={assignee.name} color={assignee.avatarColor} />}
            <Select
              value={job.assignedStaffId ?? ''}
              onChange={(e) => assignStaff(job.id, e.target.value)}
              className="flex-1"
            >
              <option value="">— Unassigned —</option>
              {staff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} · {st.role}
                </option>
              ))}
            </Select>
          </div>
        </Section>

        {/* concerns & intake */}
        {(job.customerConcerns || job.referralSource || job.estimateReadyBy) && (
          <Section title="Concerns & Intake">
            {job.customerConcerns && (
              <p className="text-sm">{job.customerConcerns}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {job.referralSource && <Badge tone="purple">Heard via: {job.referralSource}</Badge>}
              {job.estimateReadyBy && (
                <Badge tone="amber">
                  Estimate by {new Date(job.estimateReadyBy).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Badge>
              )}
            </div>
          </Section>
        )}

        {/* workflow: pending work + gate pass */}
        <Section title="Workflow">
          <p className="mb-2 text-xs font-semibold text-ink-500">Final-job departments (pending)</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PENDING_WORK_META).map(([key, meta]) => {
              const on = job.pendingWork?.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => togglePendingWork(job.id, key)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                    on
                      ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'border-ink-200 text-ink-500 dark:border-ink-700',
                  )}
                >
                  {meta.label} {on ? 'pending' : ''}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-ink-50 p-3 dark:bg-ink-800/60">
            <span className="text-sm font-medium">Gate pass</span>
            {job.gatePassIssued ? (
              <Badge tone="green">
                <DoorOpen className="h-3 w-3" /> Issued
              </Badge>
            ) : (
              <Badge tone={job.paid ? 'amber' : 'red'}>
                {job.paid ? 'Ready to issue' : 'Blocked — unpaid'}
              </Badge>
            )}
          </div>
        </Section>

        {/* services & billing */}
        <Section title="Services & Estimate">
          <ul className="space-y-2">
            {job.serviceIds.map((id) => {
              const svc = serviceById(id);
              const status = serviceStatusOf(job.serviceStatus, id);
              const meta = SERVICE_STATUS_META[status];
              return (
                <li key={id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} />
                    <span className="truncate">{svc?.name}</span>
                    {status !== 'pending' && (
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                          meta.badge,
                        )}
                      >
                        {meta.label}
                      </span>
                    )}
                  </span>
                  <span className="font-medium">{formatCurrency(svc?.price ?? 0)}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 space-y-1 border-t border-ink-100 pt-3 text-sm dark:border-ink-800">
            <Row label="Services" value={formatCurrency(servicesTotal(job))} />
            <Row label="Approved parts" value={formatCurrency(approvedPartsTotal(job))} />
            <div className="flex items-center justify-between pt-1 text-base font-bold">
              <span>Total</span>
              <span>{formatCurrency(jobTotal(job))}</span>
            </div>
          </div>
        </Section>

        {/* insurance */}
        {job.insuranceClaim && (
          <Section title="Insurance Claim">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold">{job.insuranceClaim.provider}</p>
                <p className="font-mono text-xs text-ink-400">{job.insuranceClaim.claimNo}</p>
              </div>
              <Badge tone={job.insuranceClaim.docUploaded ? 'green' : 'amber'}>
                {job.insuranceClaim.docUploaded ? 'Docs uploaded' : 'Docs pending'}
              </Badge>
            </div>
          </Section>
        )}

        {/* damage */}
        {job.damageMarkers.length > 0 && (
          <Section title="Damage Report">
            <DamageDiagram markers={job.damageMarkers} />
          </Section>
        )}

        {/* parts */}
        <Section title="Parts Requested">
          {job.parts.length === 0 ? (
            <p className="text-sm text-ink-400">No parts requested.</p>
          ) : (
            <ul className="space-y-2">
              {job.parts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {p.name} <span className="text-ink-400">×{p.quantity}</span>
                      {p.inStock === false && (
                        <a
                          href={`https://wa.me/910000000000?text=${encodeURIComponent(
                            `Parts enquiry for ${job.make} ${job.model} (${job.vehicleNo}): ${p.quantity}× ${p.name}.`,
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        >
                          <MessageCircle className="h-2.5 w-2.5" /> Out of stock
                        </a>
                      )}
                    </p>
                    <p className="text-xs text-ink-400">{formatCurrency(p.price * p.quantity)}</p>
                  </div>
                  {p.approved === null && canReviewParts ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="success" onClick={() => reviewPart(job.id, p.id, true)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => reviewPart(job.id, p.id, false)}>
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : p.approved === null ? (
                    <Badge tone="amber">Pending accountant</Badge>
                  ) : (
                    <Badge tone={p.approved ? 'green' : 'red'}>{p.approved ? 'Approved' : 'Rejected'}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* photos */}
        <Section title="Photo Documentation">
          <div className="mb-3 flex flex-wrap gap-2">
            {(['entry', 'in-progress', 'final'] as PhotoTag[]).map((t) => (
              <label key={t} className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-ink-200 px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800">
                <Camera className="h-3.5 w-3.5" /> Add {t}
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { void addCapturedPhoto(t, event.target.files?.[0]); event.target.value = ''; }} />
              </label>
            ))}
          </div>
          <PhotoGallery photos={job.photos} />
        </Section>

        {/* notes */}
        <Section title="Work Notes">
          <div className="space-y-2">
            {job.notes.map((n) => (
              <div key={n.id} className="rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-800/60">
                <p>{n.text}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {n.author} · {formatDate(n.createdAt)}
                </p>
              </div>
            ))}
            {job.notes.length === 0 && <p className="text-sm text-ink-400">No notes yet.</p>}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Add a note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && note.trim()) {
                  addNote(job.id, { text: note.trim(), author: 'Manager' });
                  setNote('');
                }
              }}
            />
            <Button
              onClick={() => {
                if (note.trim()) {
                  addNote(job.id, { text: note.trim(), author: 'Manager' });
                  setNote('');
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Section>

        {/* notifications */}
        {job.notifications && job.notifications.length > 0 && (
          <Section title="Customer Notifications">
            <ul className="space-y-2">
              {[...job.notifications].reverse().map((n) => (
                <li key={n.id} className="flex items-start gap-2 text-sm">
                  <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                  <div>
                    <p>{n.message}</p>
                    <p className="text-[11px] text-ink-400">
                      {n.channel.toUpperCase()} → {n.to} · {formatDateTime(n.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">{title}</h4>
      {children}
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-100 text-ink-500 dark:bg-ink-800">
        {icon}
      </span>
      <div>
        <p className="text-xs text-ink-400">{label}</p>
        <p className="font-bold">{value}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-ink-500">
      <span>{label}</span>
      <span className={cn('font-medium text-ink-700 dark:text-ink-300')}>{value}</span>
    </div>
  );
}
