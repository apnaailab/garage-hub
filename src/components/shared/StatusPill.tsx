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

const PRIORITY: Record<JobPriority, { tone: Parameters<typeof Badge>[0]['tone']; label: string }> = {
  low: { tone: 'gray', label: 'Low' },
  normal: { tone: 'sky', label: 'Normal' },
  high: { tone: 'red', label: 'High Priority' },
};

export function PriorityBadge({ priority }: { priority: JobPriority }) {
  const p = PRIORITY[priority];
  return <Badge tone={p.tone}>{p.label}</Badge>;
}
