import type { DamageMarker, DamageType } from '@/types';
import { cn } from '@/lib/utils';

const TYPE_COLOR: Record<DamageType, string> = {
  scratch: '#f59e0b',
  dent: '#e11d48',
  crack: '#8b5cf6',
  peeling: '#0ea5e9',
  rust: '#a16207',
};

const TYPE_LABEL: Record<DamageType, string> = {
  scratch: 'Scratch',
  dent: 'Dent',
  crack: 'Crack',
  peeling: 'Peeling',
  rust: 'Rust',
};

interface DamageDiagramProps {
  markers: DamageMarker[];
  interactive?: boolean;
  onAdd?: (x: number, y: number) => void;
  onRemove?: (id: string) => void;
  className?: string;
}

/** Top-down car diagram with positioned damage markers. */
export function DamageDiagram({
  markers,
  interactive = false,
  onAdd,
  onRemove,
  className,
}: DamageDiagramProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onAdd) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAdd(Math.round(x), Math.round(y));
  };

  return (
    <div className={cn('select-none', className)}>
      <div
        onClick={handleClick}
        className={cn(
          'relative mx-auto aspect-[2/3] max-w-[220px] rounded-3xl',
          interactive && 'cursor-crosshair',
        )}
      >
        {/* Car body top-view */}
        <svg viewBox="0 0 200 300" className="h-full w-full">
          <defs>
            <linearGradient id="carBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
          </defs>
          {/* body */}
          <rect x="40" y="20" width="120" height="260" rx="45" fill="url(#carBody)" stroke="#94a3b8" strokeWidth="2" />
          {/* windshield */}
          <path d="M55 70 Q100 55 145 70 L138 105 Q100 95 62 105 Z" fill="#bfdbfe" opacity="0.9" />
          {/* rear window */}
          <path d="M62 205 Q100 195 138 205 L145 240 Q100 250 55 240 Z" fill="#bfdbfe" opacity="0.9" />
          {/* roof */}
          <rect x="60" y="110" width="80" height="90" rx="14" fill="#e2e8f0" />
          {/* mirrors */}
          <rect x="30" y="95" width="12" height="20" rx="4" fill="#94a3b8" />
          <rect x="158" y="95" width="12" height="20" rx="4" fill="#94a3b8" />
        </svg>

        {/* Markers */}
        {markers.map((m) => (
          <button
            key={m.id}
            title={`${TYPE_LABEL[m.type]}${m.note ? ` — ${m.note}` : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (interactive && onRemove) onRemove(m.id);
            }}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
          >
            <span
              className="absolute h-6 w-6 animate-pulse-ring rounded-full"
              style={{ backgroundColor: TYPE_COLOR[m.type] }}
            />
            <span
              className="relative flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white ring-2 ring-white"
              style={{ backgroundColor: TYPE_COLOR[m.type] }}
            >
              {TYPE_LABEL[m.type][0]}
            </span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {(Object.keys(TYPE_LABEL) as DamageType[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1 text-[11px] text-ink-500">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLOR[t] }} />
            {TYPE_LABEL[t]}
          </span>
        ))}
      </div>
      {interactive && (
        <p className="mt-2 text-center text-[11px] text-ink-400">
          Tap the car to mark damage · tap a marker to remove
        </p>
      )}
    </div>
  );
}
