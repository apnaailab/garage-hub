import { Check } from 'lucide-react';
import type { StageId } from '@/types';
import { STAGES, stageIndex } from '@/lib/workflows';
import { cn } from '@/lib/utils';

interface StageProgressProps {
  current: StageId;
  variant?: 'horizontal' | 'vertical';
  /** Show stage labels under each circle (horizontal variant). Defaults to true. */
  showLabels?: boolean;
  /** When set, stages become clickable and the selected one is highlighted. */
  selectedStage?: StageId;
  onSelectStage?: (stage: StageId) => void;
  className?: string;
}

export function StageProgress({
  current,
  variant = 'horizontal',
  showLabels = true,
  selectedStage,
  onSelectStage,
  className,
}: StageProgressProps) {
  const currentIdx = stageIndex(current);
  const selectable = !!onSelectStage;

  if (variant === 'vertical') {
    return (
      <ol className={cn('relative space-y-1', className)}>
        {STAGES.map((stage, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const selected = selectedStage === stage.id;
          return (
            <li key={stage.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    done && 'bg-emerald-500 text-white',
                    active && 'bg-brand-600 text-white ring-4 ring-brand-500/20',
                    !done && !active && 'bg-ink-100 text-ink-400 dark:bg-ink-800',
                    selected && 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-ink-900',
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                {i < STAGES.length - 1 && (
                  <span
                    className={cn(
                      'my-1 w-0.5 flex-1 rounded',
                      i < currentIdx ? 'bg-emerald-500' : 'bg-ink-200 dark:bg-ink-800',
                    )}
                  />
                )}
              </div>
              {selectable ? (
                <button
                  type="button"
                  onClick={() => onSelectStage!(stage.id)}
                  className={cn(
                    'mb-2 flex-1 rounded-lg px-2 py-1 text-left transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/60',
                    selected && 'bg-ink-50 dark:bg-ink-800/60',
                  )}
                >
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      active ? 'text-brand-600 dark:text-brand-400' : !done && 'text-ink-500',
                    )}
                  >
                    {stage.label}
                  </p>
                  <p className="text-xs text-ink-400">{stage.description}</p>
                </button>
              ) : (
                <div className={cn('pb-4', active && 'text-brand-600 dark:text-brand-400')}>
                  <p className={cn('text-sm font-semibold', !done && !active && 'text-ink-500')}>
                    {stage.label}
                  </p>
                  <p className="text-xs text-ink-400">{stage.description}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div className={cn('flex items-center', className)}>
      {STAGES.map((stage, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const selected = selectedStage === stage.id;
        const Col = selectable ? 'button' : 'div';
        return (
          <div key={stage.id} className="flex flex-1 items-center last:flex-none">
            <Col
              {...(selectable ? { type: 'button' as const, onClick: () => onSelectStage!(stage.id) } : {})}
              className={cn(
                'flex min-w-0 flex-col items-center gap-1.5',
                selectable && 'cursor-pointer',
              )}
            >
              <span
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-full font-bold transition-all',
                  showLabels ? 'h-7 w-7 text-[11px]' : 'h-5 w-5 text-[9px]',
                  done && 'bg-emerald-500 text-white',
                  active && 'bg-brand-600 text-white ring-4 ring-brand-500/20 scale-110',
                  !done && !active && 'bg-ink-100 text-ink-400 dark:bg-ink-800',
                  selected && 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-ink-900',
                )}
              >
                {done ? <Check className={showLabels ? 'h-3.5 w-3.5' : 'h-3 w-3'} /> : i + 1}
              </span>
              {showLabels && (
                <span
                  className={cn(
                    'hidden text-[10px] font-medium sm:block whitespace-nowrap',
                    active || selected ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400',
                  )}
                >
                  {stage.label}
                </span>
              )}
            </Col>
            {i < STAGES.length - 1 && (
              <span
                className={cn(
                  'h-0.5 flex-1 rounded transition-colors',
                  showLabels ? 'mx-1' : 'mx-0.5',
                  i < currentIdx ? 'bg-emerald-500' : 'bg-ink-200 dark:bg-ink-800',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
