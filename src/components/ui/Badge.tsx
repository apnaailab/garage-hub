import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'sky';

const tones: Record<Tone, string> = {
  gray: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
  blue: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  red: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  purple: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = 'gray', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
