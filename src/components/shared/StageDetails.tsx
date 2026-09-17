import { CheckCircle2, Circle, Clock, ListChecks, Camera, CircleDot } from 'lucide-react';
import type { JobCard, StageId, PhotoTag } from '@/types';
import {
  STAGES,
  stageIndex,
  stageLabel,
  getStageTasks,
  serviceStatusOf,
  SERVICE_STATUS_META,
} from '@/lib/workflows';
import { PhotoGallery } from './PhotoGallery';
import { cn, formatDateTime } from '@/lib/utils';

/** Which photo tags are relevant to each stage. */
const STAGE_PHOTO_TAGS: Record<StageId, PhotoTag[]> = {
  entry: ['entry', 'exterior', 'interior', 'damage'],
  estimate: ['exterior', 'interior', 'damage'],
  'in-progress': ['in-progress'],
  'final-jobs': ['in-progress', 'final'],
  'quality-check': ['final'],
  billing: ['final'],
  delivered: ['final'],
};

export function StageDetails({ job, stage }: { job: JobCard; stage: StageId }) {
  const reached = job.stageHistory.find((h) => h.stage === stage)?.at;
  const idx = stageIndex(stage);
  const currentIdx = stageIndex(job.currentStage);
  const state: 'done' | 'current' | 'upcoming' =
    idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : 'upcoming';

  const tasks = getStageTasks(job, stage);
  const stagePhotos = job.photos.filter((p) => STAGE_PHOTO_TAGS[stage].includes(p.tag));
  const meta = STAGES[idx];

  return (
    <div className="animate-fade-in rounded-2xl border border-ink-200/70 bg-ink-50/60 p-4 dark:border-ink-800 dark:bg-ink-800/30">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {state === 'done' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : state === 'current' ? (
            <CircleDot className="h-5 w-5 text-brand-500" />
          ) : (
            <Circle className="h-5 w-5 text-ink-300" />
          )}
          <div>
            <p className="text-sm font-bold">{stageLabel(stage)}</p>
            <p className="text-[11px] text-ink-400">{meta.description}</p>
          </div>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            state === 'done'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              : state === 'current'
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                : 'bg-ink-100 text-ink-500 dark:bg-ink-800',
          )}
        >
          {state === 'done' ? 'Completed' : state === 'current' ? 'In this stage' : 'Upcoming'}
        </span>
      </div>

      {/* timestamp */}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
        <Clock className="h-3.5 w-3.5 text-ink-400" />
        {reached ? `Reached ${formatDateTime(reached)}` : 'Not reached yet'}
      </p>

      {/* tasks at this stage */}
      <div className="mt-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-400">
          <ListChecks className="h-3.5 w-3.5" /> Tasks at this stage
        </p>
        <ul className="space-y-1.5">
          {tasks.map((t) => {
            const status = serviceStatusOf(job.serviceStatus, t.id);
            const sm = SERVICE_STATUS_META[status];
            return (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-sm dark:bg-ink-900"
              >
                <span className={cn('h-2 w-2 shrink-0 rounded-full', sm.dot)} />
                <span className="min-w-0 flex-1 truncate">{t.label}</span>
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', sm.badge)}>
                  {sm.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* photos captured for this stage */}
      <div className="mt-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-400">
          <Camera className="h-3.5 w-3.5" /> Photos
        </p>
        {stagePhotos.length > 0 ? (
          <PhotoGallery photos={stagePhotos} />
        ) : (
          <p className="text-xs text-ink-400">No photos captured for this stage.</p>
        )}
      </div>
    </div>
  );
}
