import type { StageId, JobPriority } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { stageLabel } from '@/lib/workflows';

const STAGE_TONE: Record<StageId, Parameters<typeof Badge>[0]['tone']> = {
  entry: 'gray',
  estimate: 'purple',
  'in-progress': 'blue',
  'final-jobs': 'sky',
  'quality-check': 'amber',
  billing: 'red',
  delivered: 'green',
};

export function StageBadge({ stage }: { stage: StageId }) {
  return (
    <Badge tone={STAGE_TONE[stage]}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {stageLabel(stage)}
    </Badge>
  );
}

const API_STAGE_TONE: Record<string, Parameters<typeof Badge>[0]['tone']> = {
  'pending-for-pickup': 'gray',
  'pending-from-technician': 'sky',
  'pending-for-estimate': 'purple',
  'pending-for-customer-approval': 'purple',
  'pending-for-owner-approval': 'purple',
  'pending-for-parts': 'blue',
  'pending-from-accountant': 'red',
  'pending-for-payment': 'red',
  'pending-for-drop-off': 'sky',
  delivered: 'green',
};

export function ApiStageBadge({ stage }: { stage: string }) {
  const label = stage.split('-').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' ');
  return (
    <Badge tone={API_STAGE_TONE[stage] ?? 'gray'}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </Badge>
  );
}

const PRIORITY: Record<JobPriority, { tone: Parameters<typeof Badge>[0]['tone']; label: string }> = {
  low: { tone: 'gray', label: 'Low' },
  normal: { tone: 'sky', label: 'Normal' },
  high: { tone: 'red', label: 'High Priority' },
};

export function PriorityBadge({ priority }: { priority: JobPriority }) {
  const p = PRIORITY[priority];
  return <Badge tone={p.tone}>{p.label}</Badge>;
}
