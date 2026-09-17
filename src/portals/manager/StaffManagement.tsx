import { useEffect, useState, type FormEvent } from 'react';
import {
  Award,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Car,
  IndianRupee,
  Clock,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import { useStore, customerById, staffById } from '@/store/useStore';
import { PageHeader } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { StageBadge } from '@/components/shared/StatusPill';
import { JobDetailDrawer } from '@/components/shared/JobDetailDrawer';
import { serviceById } from '@/lib/workflows';
import { jobTotal } from '@/lib/jobUtils';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { usersApi, type AuthUser, type CreateUserInput } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import type { StaffRole } from '@/types';

const ROLE_TONE = {
  mechanic: 'blue',
  painter: 'red',
  detailer: 'sky',
  electrician: 'amber',
} as const;

const ACCOUNT_ROLES = [
  ['owner', 'Owner'], ['manager', 'Workshop Manager'], ['receptionist', 'Receptionist'],
  ['driver', 'Driver'], ['mechanic', 'Technician'], ['head-mechanic', 'Head Mechanic'],
  ['accountant', 'Accountant'], ['washing', 'Washing Department'],
  ['wheel-alignment', 'WA/WB Specialist'], ['crm', 'CRM Executive'], ['customer', 'Customer'],
] as const;

const STAFF_ROLE_BY_ACCOUNT: Partial<Record<string, StaffRole>> = {
  mechanic: 'mechanic',
  'head-mechanic': 'mechanic',
  washing: 'detailer',
  'wheel-alignment': 'mechanic',
};

export function StaffManagement({ onPrint }: { onPrint: (id: string) => void }) {
  const staff = useStore((s) => s.staff);
  const jobs = useStore((s) => s.jobs);
  const activeJobId = useStore((s) => s.activeJobId);
  const setActiveJob = useStore((s) => s.setActiveJob);
  const addStaff = useStore((s) => s.addStaff);
  const signedInRole = useAuthStore((s) => s.user?.role);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AuthUser[]>([]);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountError, setAccountError] = useState('');

  useEffect(() => {
    void usersApi.list().then(setAccounts).catch(() => setAccountError('Unable to load organization accounts.'));
  }, []);

  const totalCompleted = staff.reduce((s, st) => s + st.completedJobs, 0);
  const avgEff = staff.length ? Math.round(staff.reduce((s, st) => s + st.efficiency, 0) / staff.length) : 0;
  const topPerformer = [...staff].sort((a, b) => b.efficiency - a.efficiency)[0];

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <PageHeader title="Staff & Reports" subtitle="Organization accounts and team performance" actions={<Button onClick={() => setAccountModalOpen(true)}><UserPlus className="h-4 w-4" /> Add account</Button>} />

      <Card className="mb-6 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h3 className="font-bold">Organization accounts</h3><p className="text-xs text-ink-400">Real sign-in accounts stored in the backend</p></div>
          <Badge tone="blue">{accounts.length} active</Badge>
        </div>
        {accountError && <p className="mb-3 text-sm text-rose-600">{accountError}</p>}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => <div key={account.id} className="flex items-center gap-3 rounded-lg border border-ink-100 p-3 dark:border-ink-800"><Avatar name={account.name} size="sm" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{account.name}</p><p className="truncate text-xs text-ink-400">{account.email}</p></div><Badge className="ml-auto capitalize">{account.role}</Badge></div>)}
          {!accounts.length && !accountError && <p className="text-sm text-ink-400">No accounts found.</p>}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<Briefcase className="h-5 w-5" />} label="Team Members" value={String(staff.length)} />
        <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Jobs Completed" value={String(totalCompleted)} />
        <Stat icon={<TrendingUp className="h-5 w-5" />} label="Avg Efficiency" value={`${avgEff}%`} />
        <Stat
          icon={<Award className="h-5 w-5" />}
          label="Top Performer"
          value={topPerformer?.name.split(' ')[0] ?? 'None'}
        />
      </div>

      <div className="mt-6">
        {/* staff list */}
        <div>
          <h3 className="mb-3 font-bold">Team</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {staff.map((st) => {
              const load = jobs.filter((j) => j.assignedStaffId === st.id && j.currentStage !== 'delivered').length;
              return (
                <Card
                  key={st.id}
                  className="cursor-pointer p-5 transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                  onClick={() => setSelectedStaffId(st.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={st.name} color={st.avatarColor} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{st.name}</p>
                      <Badge tone={ROLE_TONE[st.role]} className="mt-0.5 capitalize">
                        {st.role}
                      </Badge>
                    </div>
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        st.available ? 'bg-emerald-500' : 'bg-ink-300',
                      )}
                      title={st.available ? 'Available' : 'Busy'}
                    />
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-ink-400">Efficiency</span>
                      <span className="font-bold">{st.efficiency}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          st.efficiency >= 90
                            ? 'bg-emerald-500'
                            : st.efficiency >= 80
                              ? 'bg-brand-500'
                              : 'bg-amber-500',
                        )}
                        style={{ width: `${st.efficiency}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Mini label="Active" value={String(load)} />
                    <Mini label="Done" value={String(st.completedJobs)} />
                    <Mini label="Status" value={st.available ? 'Free' : 'Busy'} />
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
                    View work history <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

      </div>

      <StaffDetailModal
        staffId={selectedStaffId}
        onClose={() => setSelectedStaffId(null)}
        onOpenJob={(id) => {
          setSelectedStaffId(null);
          setActiveJob(id);
        }}
      />
      <JobDetailDrawer jobId={activeJobId} onClose={() => setActiveJob(null)} onPrint={onPrint} />
      <CreateAccountModal
        open={accountModalOpen}
        allowOwner={signedInRole === 'owner'}
        onClose={() => setAccountModalOpen(false)}
        onCreated={(account) => {
          setAccounts((current) => [...current, account]);
          const staffRole = STAFF_ROLE_BY_ACCOUNT[account.role];
          if (staffRole) addStaff({ id: account.id, name: account.name, role: staffRole, avatarColor: '#3182f6', efficiency: 0, activeJobs: 0, completedJobs: 0, available: true });
          setAccountModalOpen(false);
        }}
      />
    </div>
  );
}

function CreateAccountModal({ open, allowOwner, onClose, onCreated }: { open: boolean; allowOwner: boolean; onClose: () => void; onCreated: (user: AuthUser) => void }) {
  const [form, setForm] = useState<CreateUserInput>({ name: '', email: '', phone: '', role: 'mechanic', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (patch: Partial<CreateUserInput>) => setForm((current) => ({ ...current, ...patch }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      onCreated(await usersApi.create(form));
      setForm({ name: '', email: '', phone: '', role: 'mechanic', password: '' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Account creation failed.');
    } finally {
      setSaving(false);
    }
  };
  return <Modal open={open} onClose={onClose} title="Add organization account" size="sm"><form className="space-y-4 p-5" onSubmit={(event) => void submit(event)}><div><Label>Name</Label><Input value={form.name} onChange={(event) => update({ name: event.target.value })} required /></div><div><Label>Email</Label><Input type="email" autoComplete="off" value={form.email} onChange={(event) => update({ email: event.target.value })} required /></div><div><Label>Phone</Label><Input type="tel" value={form.phone} onChange={(event) => update({ phone: event.target.value })} /></div><div><Label>Role</Label><Select value={form.role} onChange={(event) => update({ role: event.target.value })}>{ACCOUNT_ROLES.filter(([role]) => allowOwner || role !== 'owner').map(([role, label]) => <option key={role} value={role}>{label}</option>)}</Select></div><div><Label>Temporary password</Label><Input type="password" autoComplete="new-password" minLength={12} value={form.password} onChange={(event) => update({ password: event.target.value })} required /></div>{error && <p className="text-sm text-rose-600">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create account'}</Button></div></form></Modal>;
}

function StaffDetailModal({
  staffId,
  onClose,
  onOpenJob,
}: {
  staffId: string | null;
  onClose: () => void;
  onOpenJob: (jobId: string) => void;
}) {
  const staff = useStore((s) => s.staff);
  const jobs = useStore((s) => s.jobs);
  const customers = useStore((s) => s.customers);

  const member = staffById(staff, staffId ?? undefined);
  if (!member) return null;

  const workedJobs = jobs
    .filter((j) => j.assignedStaffId === member.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const active = workedJobs.filter((j) => j.currentStage !== 'delivered').length;
  const revenue = workedJobs.reduce((s, j) => s + jobTotal(j), 0);
  const uniqueCars = new Set(workedJobs.map((j) => j.vehicleNo)).size;

  return (
    <Modal open={!!staffId} onClose={onClose} title="Staff Work History" size="lg">
      <div className="p-5">
        {/* header */}
        <div className="flex items-center gap-4">
          <Avatar name={member.name} color={member.avatarColor} size="lg" />
          <div className="flex-1">
            <p className="text-lg font-extrabold">{member.name}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge tone={ROLE_TONE[member.role]} className="capitalize">
                {member.role}
              </Badge>
              <Badge tone={member.available ? 'green' : 'gray'}>
                {member.available ? 'Available' : 'Busy'}
              </Badge>
            </div>
          </div>
        </div>

        {/* stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatMini icon={<TrendingUp className="h-4 w-4" />} label="Efficiency" value={`${member.efficiency}%`} />
          <StatMini icon={<Clock className="h-4 w-4" />} label="Active now" value={String(active)} />
          <StatMini icon={<Car className="h-4 w-4" />} label="Cars worked" value={String(uniqueCars)} />
          <StatMini icon={<IndianRupee className="h-4 w-4" />} label="Revenue" value={formatCurrency(revenue)} />
        </div>

        {/* job history */}
        <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-ink-400">
          Cars worked on ({workedJobs.length})
        </p>
        {workedJobs.length === 0 ? (
          <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-400 dark:bg-ink-800/60">
            No jobs assigned yet.
          </p>
        ) : (
          <div className="space-y-2">
            {workedJobs.map((j) => {
              const cust = customerById(customers, j.customerId);
              return (
                <button
                  key={j.id}
                  onClick={() => onOpenJob(j.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-ink-200/70 p-3 text-left transition-colors hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/60"
                >
                  <span className="rounded-md bg-ink-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white dark:bg-brand-600">
                    {j.vehicleNo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {j.make} {j.model}
                    </p>
                    <p className="truncate text-xs text-ink-400">
                      {cust?.name} · {j.serviceIds.map((id) => serviceById(id)?.name).filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-bold">{formatCurrency(jobTotal(j))}</p>
                    <p className="text-[11px] text-ink-400">{formatDate(j.createdAt)}</p>
                  </div>
                  <StageBadge stage={j.currentStage} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

function StatMini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3 dark:bg-ink-800/60">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-600 dark:bg-ink-900 dark:text-brand-400">
        {icon}
      </span>
      <p className="mt-2 text-base font-extrabold leading-tight">{value}</p>
      <p className="text-[11px] text-ink-400">{label}</p>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="flex items-center gap-3 p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
        {icon}
      </span>
      <div>
        <p className="text-xl font-extrabold tracking-tight">{value}</p>
        <p className="text-xs text-ink-400">{label}</p>
      </div>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 py-2 dark:bg-ink-800/60">
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ink-400">{label}</p>
    </div>
  );
}
