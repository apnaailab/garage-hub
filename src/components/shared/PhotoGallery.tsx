import { useState } from 'react';
import type { Photo, PhotoTag } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { cn, formatDateTime } from '@/lib/utils';
import { ImageOff } from 'lucide-react';

const TAG_META: Record<PhotoTag, { label: string; tone: Parameters<typeof Badge>[0]['tone'] }> = {
  entry: { label: 'Entry Inspection', tone: 'gray' },
  exterior: { label: 'Exterior', tone: 'sky' },
  interior: { label: 'Interior', tone: 'purple' },
  'in-progress': { label: 'Work in Progress', tone: 'blue' },
  final: { label: 'Final Finish', tone: 'green' },
  damage: { label: 'Damage', tone: 'red' },
};

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [active, setActive] = useState<Photo | null>(null);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 py-10 text-ink-400 dark:border-ink-700">
        <ImageOff className="mb-2 h-8 w-8" />
        <p className="text-sm">No photos uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p)}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800"
          >
            <img
              src={p.url}
              alt={p.caption ?? p.tag}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <Badge tone={TAG_META[p.tag].tone} className="text-[10px]">
                {TAG_META[p.tag].label}
              </Badge>
            </div>
          </button>
        ))}
      </div>

      <Modal open={!!active} onClose={() => setActive(null)} size="lg">
        {active && (
          <div>
            <img src={active.url} alt={active.caption ?? active.tag} className="w-full" />
            <div className="flex items-center justify-between p-4">
              <div>
                <Badge tone={TAG_META[active.tag].tone}>{TAG_META[active.tag].label}</Badge>
                {active.caption && (
                  <p className="mt-2 text-sm font-medium">{active.caption}</p>
                )}
              </div>
              <p className="text-xs text-ink-400">{formatDateTime(active.uploadedAt)}</p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export function PhotoTagBadge({ tag, className }: { tag: PhotoTag; className?: string }) {
  return (
    <Badge tone={TAG_META[tag].tone} className={cn(className)}>
      {TAG_META[tag].label}
    </Badge>
  );
}
