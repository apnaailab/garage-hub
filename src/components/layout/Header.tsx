import { useEffect, useState } from 'react';
import { Search, Moon, Sun, ChevronDown, Wrench, Car, X, LogOut, Building2 } from 'lucide-react';
import { useStore, customerById } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { ROLE_META, serviceById } from '@/lib/workflows';
import { StageBadge } from '@/components/shared/StatusPill';

export function Header() {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const garageName = useAuthStore((s) => s.garageName);

  return (
    <header className="no-print z-30 flex h-16 shrink-0 items-center gap-2 border-b border-ink-200 bg-white/80 px-3 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-900/80 sm:gap-3 sm:px-6">
      {/* mobile logo */}
      <div className="flex shrink-0 items-center gap-2 lg:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Wrench className="h-4 w-4" />
        </span>
        <span className="max-w-24 truncate text-xs font-extrabold sm:max-w-36 sm:text-sm" title={garageName ?? 'Your garage'}>{garageName ?? 'Your garage'}</span>
      </div>

      <GlobalSearch />

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <GarageSelector />
        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
          title="Toggle theme"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>
        <AccountMenu />
      </div>
    </header>
  );
}

function GarageSelector() {
  const user = useAuthStore((state) => state.user);
  const organizations = useAuthStore((state) => state.organizations);
  const loadOrganizations = useAuthStore((state) => state.loadOrganizations);
  const switchOrganization = useAuthStore((state) => state.switchOrganization);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') void loadOrganizations().catch(() => undefined);
  }, [loadOrganizations, user?.role]);

  if (user?.role !== 'admin') return null;

  return (
    <label className="relative flex h-10 min-w-0 items-center rounded-xl border border-ink-200 bg-white pl-2 dark:border-ink-700 dark:bg-ink-800" title="Selected garage">
      <Building2 className="h-4 w-4 shrink-0 text-brand-600" />
      <select
        aria-label="Selected garage"
        className="h-full min-w-0 max-w-32 bg-transparent pl-1 pr-6 text-xs font-semibold outline-none sm:max-w-52 sm:text-sm"
        value={user.organizationId}
        disabled={switching}
        onChange={async (event) => {
          setSwitching(true);
          try { await switchOrganization(event.target.value); }
          catch { return; }
          finally { setSwitching(false); }
        }}
      >
        {!organizations.some((organization) => organization.id === user.organizationId) && <option value={user.organizationId}>Current garage</option>}
        {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
      </select>
    </label>
  );
}

function GlobalSearch() {
  const search = useStore((s) => s.search);
  const setSearch = useStore((s) => s.setSearch);
  const jobs = useStore((s) => s.jobs);
  const customers = useStore((s) => s.customers);
  const setActiveJob = useStore((s) => s.setActiveJob);
  const [focused, setFocused] = useState(false);

  const q = search.trim().toLowerCase();
  const results = q
    ? jobs
        .filter((j) => {
          const cust = customerById(customers, j.customerId);
          return (
            j.vehicleNo.toLowerCase().includes(q) ||
            j.id.toLowerCase().includes(q) ||
            `${j.make} ${j.model}`.toLowerCase().includes(q) ||
            cust?.name.toLowerCase().includes(q)
          );
        })
        .slice(0, 6)
    : [];

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Search vehicle no., customer or job ID…"
        className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-8 text-sm outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-800 dark:focus:bg-ink-900"
      />
      {search && (
        <button
          onClick={() => setSearch('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-700"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {focused && q && (
        <div className="absolute left-0 right-0 top-12 z-40 animate-scale-in overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-xl dark:border-ink-700 dark:bg-ink-800">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-ink-400">No matches for “{search}”.</p>
          ) : (
            results.map((j) => {
              const cust = customerById(customers, j.customerId);
              return (
                <button
                  key={j.id}
                  onMouseDown={() => {
                    setActiveJob(j.id);
                    setSearch('');
                  }}
                  className="flex w-full items-center gap-3 border-b border-ink-100 px-4 py-2.5 text-left last:border-0 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-700/60"
                >
                  <Car className="h-4 w-4 text-ink-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {j.vehicleNo} · {j.make} {j.model}
                    </p>
                    <p className="truncate text-xs text-ink-400">
                      {cust?.name} · {serviceById(j.serviceIds[0])?.name}
                    </p>
                  </div>
                  <StageBadge stage={j.currentStage} />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function AccountMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const role = useStore((s) => s.role);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-2.5 py-1.5 text-sm font-semibold hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:hover:bg-ink-700"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-[11px] font-bold text-white">
          {user?.name[0] ?? ROLE_META[role].label[0]}
        </span>
        <span className="hidden sm:inline">{user?.name ?? ROLE_META[role].label}</span>
        <ChevronDown className="h-4 w-4 text-ink-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-64 animate-scale-in overflow-hidden rounded-2xl border border-ink-200 bg-white p-1.5 shadow-xl dark:border-ink-700 dark:bg-ink-800">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-ink-400">{user?.email}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-brand-600">{ROLE_META[role].label}</p>
            </div>
            <div className="mt-1 border-t border-ink-100 pt-1 dark:border-ink-700">
              <button
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm text-ink-500 transition-colors hover:bg-ink-50 dark:hover:bg-ink-700"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-700">
                  <LogOut className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Sign out</p>
                  <p className="text-[11px] text-ink-400">End this secure session</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
