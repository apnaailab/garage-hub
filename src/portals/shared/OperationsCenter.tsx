import { useEffect, useState } from 'react';
import { Bell, Boxes, CheckCircle2, Clock3, LogIn, LogOut, RefreshCw, Truck, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface DashboardData {
  role: string;
  totalJobs: number;
  byStage: { stage: string; count: number }[];
  lowStock: number;
  unread: number;
  dueReminders: number;
  todayAttendance: number;
}

interface ApiJob {
  id: string;
  number: string;
  stage: string;
  intakeMode: string;
  estimateDueAt?: string;
  estimatedDeliveryAt?: string;
}

const ROLE_GUIDANCE: Record<string, string[]> = {
  owner: ['Approve estimates and invoices', 'Review profit, audit and workshop bottlenecks', 'Monitor all staff and customer notifications'],
  manager: ['Control intake, estimates and job allocation', 'Approve changes to customer voice and labour', 'Coordinate pickup, workshop and delivery'],
  receptionist: ['Register customers, vehicles and documents', 'Create walk-in and pickup job cards', 'Capture accessories, fuel, photos and signatures'],
  driver: ['Review pickup address, phone and directions', 'Share ETA and capture mandatory condition photos', 'Confirm pickup, arrival, delivery and cash collection'],
  mechanic: ['Accept assigned jobs and complete checklists', 'Request parts and record work time', 'Pause, resume and complete approved work'],
  'head-mechanic': ['Monitor technician queues', 'Conduct final trials and quality checks', 'Route pending washing and WA/WB work'],
  accountant: ['Approve parts and manage inventory thresholds', 'Prepare GST/general invoices and confirm payment', 'Issue gate passes only after payment rules pass'],
  washing: ['Accept washing assignments', 'Publish completion ETA', 'Mark work started and completed'],
  'wheel-alignment': ['Accept wheel alignment/balancing assignments', 'Publish completion ETA', 'Mark work started and completed'],
  crm: ['Process service, insurance and PUC reminders', 'Manage birthdays, anniversaries and follow-ups', 'Send review and renewal campaigns'],
  customer: ['Track vehicle and driver status', 'Review documents, photos, estimates and invoice', 'Sign disclosures and approve selectable parts'],
};

export function OperationsCenter() {
  const user = useAuthStore((s) => s.user);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      const [summary, jobList] = await Promise.all([
        api<DashboardData>('/dashboard'),
        api<ApiJob[]>('/jobs'),
      ]);
      setDashboard(summary);
      setJobs(jobList);
    } catch {
      setError('Could not load the operations API. Confirm the .NET service is running.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const attendance = async (eventType: string) => {
    setBusy(true);
    try {
      await api('/attendance', { method: 'POST', body: JSON.stringify({ eventType }) });
      await load();
    } catch {
      setError('Attendance update failed.');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <PageHeader
        title={`${user?.name ?? 'Operations'} workspace`}
        subtitle="Role-based command center backed by the GarageHub API"
        actions={<Button variant="outline" onClick={() => void load()} disabled={busy}><RefreshCw className="h-4 w-4" /> Refresh</Button>}
      />

      {error && <p className="mb-5 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={CheckCircle2} label="Visible jobs" value={dashboard?.totalJobs ?? 0} />
        <Metric icon={Bell} label="Unread alerts" value={dashboard?.unread ?? 0} />
        <Metric icon={Clock3} label="Due reminders" value={dashboard?.dueReminders ?? 0} />
        <Metric icon={Boxes} label="Low stock" value={dashboard?.lowStock ?? 0} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Role queue</h2>
              <Badge tone="blue">{user?.role}</Badge>
            </div>
            {jobs.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-400">No assigned jobs.</p>
            ) : (
              <div className="space-y-2">
                {jobs.slice(0, 10).map((job) => (
                  <div key={job.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                    <span className="font-mono text-sm font-bold">{job.number}</span>
                    <span className="text-xs text-ink-400">{job.intakeMode}</span>
                    <Badge tone="amber" className="ml-auto">{job.stage.split('-').join(' ')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-5">
              <h2 className="mb-3 flex items-center gap-2 font-bold"><Users className="h-4 w-4" /> Responsibilities</h2>
              <ul className="space-y-2 text-sm text-ink-600 dark:text-ink-300">
                {(ROLE_GUIDANCE[user?.role ?? ''] ?? []).map((item) => <li key={item} className="flex gap-2"><span className="text-brand-600">•</span>{item}</li>)}
              </ul>
            </CardContent>
          </Card>

          {user?.role !== 'customer' && (
            <Card>
              <CardContent className="pt-5">
                <h2 className="mb-3 font-bold">Attendance</h2>
                <p className="mb-3 text-xs text-ink-400">Today's events: {dashboard?.todayAttendance ?? 0}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={() => void attendance('login')} disabled={busy}><LogIn className="h-4 w-4" /> Log in</Button>
                  <Button size="sm" variant="outline" onClick={() => void attendance('lunch-out')} disabled={busy}>Lunch out</Button>
                  <Button size="sm" variant="outline" onClick={() => void attendance('lunch-in')} disabled={busy}>Lunch in</Button>
                  <Button size="sm" variant="outline" onClick={() => void attendance('logout')} disabled={busy}><LogOut className="h-4 w-4" /> Log out</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {user?.role === 'driver' && (
            <Card>
              <CardContent className="pt-5">
                <h2 className="mb-2 flex items-center gap-2 font-bold"><Truck className="h-4 w-4" /> Driver safety</h2>
                <p className="text-sm text-ink-500">Driver photo, licence, directions, ETA and vehicle handover records are required before pickup completion.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card className="mt-6">
        <CardContent className="pt-5">
          <h2 className="mb-4 font-bold">Workshop status</h2>
          <div className="flex flex-wrap gap-2">
            {(dashboard?.byStage ?? []).map((item) => <Badge key={item.stage} tone="blue">{item.stage.split('-').join(' ')} · {item.count}</Badge>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Bell; label: string; value: number }) {
  return <Card><CardContent className="flex items-center gap-3 pt-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950"><Icon className="h-5 w-5" /></span><div><p className="text-2xl font-extrabold">{value}</p><p className="text-xs text-ink-400">{label}</p></div></CardContent></Card>;
}
