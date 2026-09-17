import { useStore } from '@/store/useStore';
import { NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';

/** Mobile bottom action bar — primary nav for mechanic & customer portals. */
export function BottomBar() {
  const role = useStore((s) => s.role);
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);
  const items = NAV[role];

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-ink-200 bg-white/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-ink-800 dark:bg-ink-900/90 lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = page === item.page;
        return (
          <button
            key={item.page}
            onClick={() => setPage(item.page)}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
              active ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400',
            )}
          >
            <Icon className={cn('h-5 w-5', active && 'scale-110')} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
