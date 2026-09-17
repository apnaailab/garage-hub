import { useState } from 'react';
import {
  Camera,
  Check,
  ChevronRight,
  Wrench,
  Plus,
  StickyNote,
  Package,
  Play,
  Ban,
} from 'lucide-react';
import { useStore, staffById } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StageProgress } from '@/components/shared/StageProgress';
import { PhotoGallery } from '@/components/shared/PhotoGallery';
import { StageBadge } from '@/components/shared/StatusPill';
import { nextStage, stageLabel, serviceStatusOf, getStageTasks } from '@/lib/workflows';
import { cn } from '@/lib/utils';
import { uploadImage } from '@/lib/images';
import type { JobCard, PhotoTag, ServiceWorkStatus } from '@/types';

export function TaskView() {
  const user = useAuthStore((s) => s.user);
  const staff = useStore((s) => s.staff);
  const jobs = useStore((s) => s.jobs);
  const activeStaffId = useStore((s) => s.activeStaffId);
  const setActiveStaff = useStore((s) => s.setActiveStaff);

  const staffId = activeStaffId || user?.id || '';
  const me = staffById(staff, staffId);
  const displayName = me?.name ?? user?.name ?? 'Mechanic';
  const displayRole = me?.role ?? user?.role ?? 'mechanic';
  const myJobs = jobs.filter(
    (j) => j.assignedStaffId === staffId && j.currentStage !== 'delivered',
  );

  return (
    <div className="mx-auto max-w-xl p-4 pb-24">
      {/* mechanic header */}
      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white">
        <Avatar name={displayName} color={me?.avatarColor ?? '#ffffff33'} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold leading-tight">{displayName}</p>
          <p className="text-xs capitalize opacity-80">
            {displayRole} · {myJobs.length} active task{myJobs.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* switch mechanic (demo) */}
      <div className="mb-5 flex gap-2 overflow-x-auto scrollbar-thin pb-1">
        {staff
          .filter((s) => s.role === 'mechanic' || s.role === 'painter' || s.role === 'detailer' || s.role === 'electrician')
          .map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveStaff(s.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                staffId === s.id
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                  : 'border-ink-200 dark:border-ink-700',
              )}
            >
              <Avatar name={s.name} color={s.avatarColor} size="sm" />
              {s.name.split(' ')[0]}
            </button>
          ))}
      </div>

      {myJobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-300 py-16 text-center text-ink-400 dark:border-ink-700">
          <Check className="mx-auto mb-2 h-8 w-8" />
          <p className="font-medium">All caught up!</p>
          <p className="text-sm">No active tasks assigned.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myJobs.map((job) => (
            <TaskCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ job }: { job: JobCard }) {
  const advanceStage = useStore((s) => s.advanceStage);
  const setServiceStatus = useStore((s) => s.setServiceStatus);
  const addPhoto = useStore((s) => s.addPhoto);
  const addPart = useStore((s) => s.addPart);
  const addNote = useStore((s) => s.addNote);

  const [expanded, setExpanded] = useState(true);
  const [partModal, setPartModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);
  const [partName, setPartName] = useState('');
  const [partPrice, setPartPrice] = useState('');
  const [partInStock, setPartInStock] = useState(true);
  const [noteText, setNoteText] = useState('');

  const nxt = nextStage(job.currentStage);

  // Tasks are specific to the car's current stage. During 'in-progress' they are
  // the actual services; other stages use a standard checklist.
  const tasks = getStageTasks(job, job.currentStage);
  const statuses = tasks.map((t) => serviceStatusOf(job.serviceStatus, t.id));
  const completeCount = statuses.filter((s) => s === 'complete').length;
  const blockedCount = statuses.filter((s) => s === 'blocked').length;
  const allComplete = tasks.length > 0 && completeCount === tasks.length;

  /** Tap the active status again to revert it to pending. */
  const toggleStatus = (taskId: string, status: ServiceWorkStatus) =>
    setServiceStatus(
      job.id,
      taskId,
      serviceStatusOf(job.serviceStatus, taskId) === status ? 'pending' : status,
    );

  const capture = async (tag: PhotoTag, file: File | undefined) => {
    if (!file) return;
    addPhoto(job.id, {
      url: await uploadImage(file, `job-${tag}`),
      tag,
      caption: `${stageLabel(job.currentStage)} · ${tag}`,
      uploadedBy: job.assignedStaffId ?? 'me',
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900">
      {/* header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="rounded-lg bg-ink-900 px-2 py-1 font-mono text-[11px] font-bold text-white dark:bg-brand-600">
          {job.vehicleNo}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">
            {job.make} {job.model}
          </p>
          <p className="truncate text-xs text-ink-400">
            {completeCount}/{tasks.length} tasks done
            {blockedCount > 0 && (
              <span className="text-rose-500"> · {blockedCount} blocked</span>
            )}
          </p>
        </div>
        <StageBadge stage={job.currentStage} />
        <ChevronRight className={cn('h-5 w-5 text-ink-400 transition-transform', expanded && 'rotate-90')} />
      </button>

      {expanded && (
        <div className="border-t border-ink-100 p-4 dark:border-ink-800">
          <StageProgress current={job.currentStage} className="mb-4" />

          {/* stage-specific tasks */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-400">
              {stageLabel(job.currentStage)} Tasks
            </p>
            <span className="text-[11px] font-medium text-ink-400">
              {completeCount}/{tasks.length} complete
            </span>
          </div>
          <ul className="mb-4 space-y-2.5">
            {tasks.map((task) => {
              const status = serviceStatusOf(job.serviceStatus, task.id);
              return (
                <li
                  key={task.id}
                  className={cn(
                    'rounded-xl border p-3 transition-colors',
                    status === 'complete'
                      ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/30'
                      : status === 'blocked'
                        ? 'border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/30'
                        : status === 'in-progress'
                          ? 'border-brand-200 bg-brand-50/60 dark:border-brand-900/60 dark:bg-brand-950/30'
                          : 'border-ink-200/70 bg-ink-50 dark:border-ink-800 dark:bg-ink-800/60',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-sm font-semibold">{task.label}</span>
                    {task.hint && <span className="text-xs text-ink-400">{task.hint}</span>}
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                    <StatusButton
                      active={status === 'in-progress'}
                      tone="brand"
                      icon={<Play className="h-3.5 w-3.5" />}
                      label="In Progress"
                      onClick={() => toggleStatus(task.id, 'in-progress')}
                    />
                    <StatusButton
                      active={status === 'complete'}
                      tone="emerald"
                      icon={<Check className="h-3.5 w-3.5" />}
                      label="Complete"
                      onClick={() => toggleStatus(task.id, 'complete')}
                    />
                    <StatusButton
                      active={status === 'blocked'}
                      tone="rose"
                      icon={<Ban className="h-3.5 w-3.5" />}
                      label="Blocked"
                      onClick={() => toggleStatus(task.id, 'blocked')}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {blockedCount > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <Ban className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {blockedCount} task{blockedCount > 1 ? 's' : ''} blocked. Add a note so the
                manager can unblock it.
              </span>
            </div>
          )}

          {/* photo capture */}
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Photo Capture</p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {(['entry', 'in-progress', 'final'] as PhotoTag[]).map((t) => (
              <label key={t} className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-ink-200 px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800">
                <Camera className="h-3.5 w-3.5" />
                <span className="capitalize">{t === 'in-progress' ? 'WIP' : t}</span>
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { void capture(t, event.target.files?.[0]); event.target.value = ''; }} />
              </label>
            ))}
          </div>
          {job.photos.length > 0 && <PhotoGallery photos={job.photos} />}

          {/* quick actions */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPartModal(true)}>
              <Package className="h-4 w-4" /> Request Part
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setNoteModal(true)}>
              <StickyNote className="h-4 w-4" /> Add Note
            </Button>
          </div>

          {/* parts pending */}
          {job.parts.length > 0 && (
            <div className="mt-3 space-y-1">
              {job.parts.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Wrench className="h-3 w-3 text-ink-400" />
                    {p.name} ×{p.quantity}
                  </span>
                  <Badge tone={p.approved === null ? 'amber' : p.approved ? 'green' : 'red'}>
                    {p.approved === null ? 'Pending' : p.approved ? 'Approved' : 'Rejected'}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* advance — only once every task for this stage is complete */}
          {nxt && (
            <Button
              className="mt-4 w-full"
              size="lg"
              variant={allComplete ? 'success' : 'primary'}
              disabled={blockedCount > 0 || !allComplete}
              onClick={() => advanceStage(job.id)}
            >
              <Check className="h-5 w-5" />
              {blockedCount > 0
                ? 'Resolve blocked tasks first'
                : !allComplete
                  ? `Complete all ${stageLabel(job.currentStage)} tasks to advance`
                  : `Mark ${stageLabel(job.currentStage)} Done → ${stageLabel(nxt)}`}
            </Button>
          )}
        </div>
      )}

      {/* part modal */}
      <Modal open={partModal} onClose={() => setPartModal(false)} title="Request a Part" size="sm">
        <div className="space-y-3 p-5">
          <Input placeholder="Part name" value={partName} onChange={(e) => setPartName(e.target.value)} />
          <Input
            type="number"
            placeholder="Estimated price (₹)"
            value={partPrice}
            onChange={(e) => setPartPrice(e.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink-200 p-3 text-sm dark:border-ink-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={!partInStock}
              onChange={(e) => setPartInStock(!e.target.checked)}
            />
            <span className="font-medium">Not in stock</span>
            <span className="ml-auto text-xs text-ink-400">accountant will raise a supplier enquiry</span>
          </label>
          <Button
            className="w-full"
            onClick={() => {
              if (partName.trim()) {
                addPart(job.id, {
                  name: partName.trim(),
                  quantity: 1,
                  price: Number(partPrice) || 0,
                  approved: null,
                  inStock: partInStock,
                  notedBy: job.assignedStaffId ?? 'me',
                });
                setPartName('');
                setPartPrice('');
                setPartInStock(true);
                setPartModal(false);
              }
            }}
          >
            <Plus className="h-4 w-4" /> Send for Approval
          </Button>
        </div>
      </Modal>

      {/* note modal */}
      <Modal open={noteModal} onClose={() => setNoteModal(false)} title="Add a Note" size="sm">
        <div className="space-y-3 p-5">
          <Input placeholder="Type your note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          <Button
            className="w-full"
            onClick={() => {
              if (noteText.trim()) {
                addNote(job.id, { text: noteText.trim(), author: 'Mechanic' });
                setNoteText('');
                setNoteModal(false);
              }
            }}
          >
            Save Note
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const TONES = {
  brand: {
    active: 'bg-brand-600 text-white border-brand-600',
    idle: 'border-ink-200 text-brand-600 hover:bg-brand-50 dark:border-ink-700 dark:hover:bg-brand-950/40',
  },
  emerald: {
    active: 'bg-emerald-600 text-white border-emerald-600',
    idle: 'border-ink-200 text-emerald-600 hover:bg-emerald-50 dark:border-ink-700 dark:hover:bg-emerald-950/40',
  },
  rose: {
    active: 'bg-rose-600 text-white border-rose-600',
    idle: 'border-ink-200 text-rose-600 hover:bg-rose-50 dark:border-ink-700 dark:hover:bg-rose-950/40',
  },
} as const;

function StatusButton({
  active,
  tone,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  tone: keyof typeof TONES;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center justify-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-semibold transition-all active:scale-95',
        active ? TONES[tone].active : TONES[tone].idle,
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

