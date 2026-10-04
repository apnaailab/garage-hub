import { Wrench } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { NAV } from '@/lib/nav';
import { ROLE_META } from '@/lib/workflows';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const role = useStore((s) => s.role);
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);
  const garageName = useAuthStore((s) => s.garageName);
  const items = NAV[role];

  return (
    <aside className="no-print hidden h-full w-64 shrink-0 flex-col overflow-hidden border-r border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 lg:flex">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
          <Wrench className="h-5 w-5" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-lg font-extrabold tracking-tight" title={garageName ?? 'Your garage'}>{garageName ?? 'Your garage'}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-ink-400">
            Service Ops
          </p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">
          {ROLE_META[role].label}
        </p>
        {items.map((item) => {
          const Icon = item.icon;
          const active = page === item.page;
          return (
            <button
              key={item.page}
              onClick={() => setPage(item.page)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                  : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-ink-100 p-4 dark:border-ink-800">
        <p className="text-[10px] font-medium uppercase tracking-wider text-ink-400">Powered by</p>
        <p className="mt-0.5 text-sm font-extrabold text-ink-700 dark:text-ink-200">GarageHub</p>
        <p className="mt-1 text-[11px] text-ink-400">Workshop management platform</p>
      </div>
    </aside>
  );
}
