import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Car, Check, Clock, LogOut, Receipt, ShieldCheck, Wrench, X } from 'lucide-react';
import { customerPortalApi } from '@/lib/api';
import { serviceById, stageLabel } from '@/lib/workflows';
import { formatCurrency, formatDateTime, timeFromNow } from '@/lib/utils';
import { StageProgress } from '@/components/shared/StageProgress';
import { PhotoGallery } from '@/components/shared/PhotoGallery';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input, Label } from '@/components/ui/Input';
import type { JobCard, PartRequest, Photo } from '@/types';

interface PublicPortalData {
  trackingId: string;
  garage: { name: string; logoUrl: string | null; paymentInstructions: string };
  customer: { name: string };
  assignedStaff: { name: string; role: string } | null;
  job: JobCard;
  expiresAt: string | null;
}

export function PublicTracker() {
  const [trackingId, setTrackingId] = useState('');
  const [phoneLastFour, setPhoneLastFour] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [data, setData] = useState<PublicPortalData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signerName, setSignerName] = useState('');
  const load = useCallback(async (token: string) => {
    const result = await customerPortalApi.get<PublicPortalData>(token);
    setData(result);
    setSignerName((current) => current || result.customer.name);
  }, []);

  const startSession = useCallback(async (id: string, input: { phoneLastFour: string }) => {
    setLoading(true);
    setError('');
    try {
      const session = await customerPortalApi.login(id, input);
      sessionStorage.setItem(`garagehub-tracking:${session.trackingId}`, session.token);
      setTrackingId(session.trackingId);
      setSessionToken(session.token);
      await load(session.token);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to open tracking portal.');
      setSessionToken('');
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    if (sessionToken) void load(sessionToken).catch(() => setSessionToken(''));
  }, [load, sessionToken]);

  useEffect(() => {
    if (!sessionToken || !data) return;
    const timer = window.setInterval(() => void load(sessionToken).catch(() => undefined), 5000);
    return () => window.clearInterval(timer);
  }, [data, load, sessionToken]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void startSession(trackingId.trim().toUpperCase(), { phoneLastFour });
  };

  const act = async (action: { action: string; partId?: string; approved?: boolean; signerName?: string }) => {
    if (!sessionToken) return;
    setLoading(true);
    setError('');
    try {
      await customerPortalApi.action(sessionToken, action);
      await load(sessionToken);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save your response.');
    } finally {
      setLoading(false);
    }
  };

  const resolvePhoto = useCallback(async (reference: string) => reference.startsWith('document:')
    ? await customerPortalApi.photoUrl(reference.slice('document:'.length), sessionToken)
    : reference, [sessionToken]);

  if (!data || !sessionToken) {
    return (
      <main className="scrollbar-thin flex h-full overflow-y-auto bg-ink-50 p-4 dark:bg-ink-950 sm:items-center sm:justify-center">
        <Card className="w-full max-w-md p-7">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-600 text-white"><Car className="h-6 w-6" /></span>
            <div><h1 className="text-xl font-extrabold">Track your vehicle</h1><p className="text-sm text-ink-400">No account or password required</p></div>
          </div>
          <form className="space-y-4" onSubmit={submit}>
            <div><Label htmlFor="tracking-id">Tracking ID</Label><Input id="tracking-id" value={trackingId} onChange={(event) => setTrackingId(event.target.value.toUpperCase())} placeholder="GH-XXXXXXXXXX" required /></div>
            <div><Label htmlFor="phone-last-four">Last 4 digits of customer phone</Label><Input id="phone-last-four" value={phoneLastFour} onChange={(event) => setPhoneLastFour(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" minLength={4} maxLength={4} required /></div>
            {error && <p className="border-l-2 border-rose-500 pl-3 text-sm text-rose-600">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading || phoneLastFour.length !== 4}>{loading ? 'Opening…' : 'View vehicle updates'}</Button>
          </form>
          <button className="mt-5 w-full text-center text-sm font-semibold text-ink-400 hover:text-ink-700" onClick={() => { window.location.href = '/'; }}>Staff sign in</button>
        </Card>
      </main>
    );
  }

  const { job } = data;
  const pendingParts = job.parts.filter((part) => part.approved === null);
  const total = job.serviceIds.reduce((sum, id) => sum + (serviceById(id)?.price ?? 0), 0)
    + job.parts.filter((part) => part.approved === true).reduce((sum, part) => sum + part.price * part.quantity, 0);
  const notifications = job.notifications ?? [];

  return (
    <main className="scrollbar-thin h-full overflow-y-auto bg-ink-50 dark:bg-ink-950">
      <header className="border-b border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          {data.garage.logoUrl ? <img src={customerPortalApi.assetUrl(data.garage.logoUrl)} alt="" className="h-10 w-10 object-contain" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white"><Wrench className="h-5 w-5" /></span>}
          <div className="min-w-0 flex-1"><p className="truncate font-extrabold">{data.garage.name}</p><p className="font-mono text-xs text-ink-400">{data.trackingId}</p></div>
          <Button size="icon" variant="ghost" title="Close tracking portal" onClick={() => { sessionStorage.removeItem(`garagehub-tracking:${data.trackingId}`); window.location.href = '/track'; }}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 p-4 pb-12 sm:p-6">
        <section className="bg-brand-700 p-5 text-white">
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm opacity-75">Hello, {data.customer.name}</p><h1 className="mt-1 text-2xl font-extrabold">{job.make} {job.model}</h1><p className="mt-1 font-mono text-sm opacity-80">{job.vehicleNo}</p></div><Badge tone="sky">{stageLabel(job.currentStage)}</Badge></div>
          {job.currentStage !== 'delivered' && <p className="mt-4 flex items-center gap-2 text-sm"><Clock className="h-4 w-4" /> Estimated ready {timeFromNow(job.estimatedDelivery)}</p>}
        </section>

        {error && <p className="border-l-2 border-rose-500 pl-3 text-sm text-rose-600">{error}</p>}

        <Card className="p-5"><h2 className="mb-4 font-bold">Service progress</h2><StageProgress current={job.currentStage} variant="vertical" /></Card>

        <Card className="p-5">
          <h2 className="mb-3 font-bold">Services</h2>
          <div className="flex flex-wrap gap-2">{job.serviceIds.map((id) => <Badge key={id} tone="blue">{serviceById(id)?.name ?? id}</Badge>)}</div>
          {data.assignedStaff && <p className="mt-4 text-sm text-ink-500"><Wrench className="mr-1 inline h-4 w-4" /> {data.assignedStaff.name} · {data.assignedStaff.role}</p>}
        </Card>

        {job.photos.length > 0 && <Card className="p-5"><h2 className="mb-3 font-bold">Vehicle photos</h2><PhotoGallery photos={job.photos as Photo[]} resolveUrl={resolvePhoto} /></Card>}

        {(pendingParts.length > 0 || job.extraWorkApproved === null) && (
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold"><Receipt className="h-4 w-4" /> Your approvals</h2>
            {pendingParts.map((part: PartRequest) => <div key={part.id} className="flex flex-wrap items-center gap-3 border-b border-ink-100 py-3 last:border-0 dark:border-ink-800"><div className="min-w-0 flex-1"><p className="font-semibold">{part.name} ×{part.quantity}</p><p className="text-sm text-ink-400">{formatCurrency(part.price * part.quantity)}</p></div><Button size="sm" variant="success" disabled={loading} onClick={() => void act({ action: 'part-decision', partId: part.id, approved: true })}><Check className="h-3.5 w-3.5" /> Approve</Button><Button size="sm" variant="outline" disabled={loading} onClick={() => void act({ action: 'part-decision', partId: part.id, approved: false })}><X className="h-3.5 w-3.5" /> Decline</Button></div>)}
            {job.extraWorkApproved === null && <Button className="mt-3 w-full" disabled={loading} onClick={() => void act({ action: 'approve-estimate' })}>Approve current estimate</Button>}
          </Card>
        )}

        <Card className="p-5">
          <h2 className="mb-2 flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4" /> Customer consent</h2>
          {job.customerConsent ? <p className="text-sm text-emerald-600">Accepted by {job.customerConsent.signerName} on {formatDateTime(job.customerConsent.acceptedAt)}</p> : <div className="space-y-3"><p className="text-sm text-ink-500">I authorize the workshop to inspect and service this vehicle according to the approved work.</p><div><Label>Signer name</Label><Input value={signerName} onChange={(event) => setSignerName(event.target.value)} /></div><Button disabled={loading || !signerName.trim()} onClick={() => void act({ action: 'accept-consent', signerName })}>Accept and sign</Button></div>}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold">Payment</h2><strong className="text-lg">{formatCurrency(total)}</strong></div>
          {job.paid ? <p className="mt-3 text-sm font-semibold text-emerald-600">Payment received. Thank you.</p> : <p className="mt-3 text-sm text-ink-500">{data.garage.paymentInstructions}</p>}
        </Card>

        {notifications.length > 0 && <Card className="p-5"><h2 className="mb-3 font-bold">Updates</h2><div className="space-y-3">{[...notifications].reverse().map((notification) => <div key={notification.id} className="border-l-2 border-brand-400 pl-3"><p className="text-sm">{notification.message}</p><p className="mt-1 text-xs text-ink-400">{formatDateTime(notification.at)}</p></div>)}</div></Card>}

        {data.expiresAt && <p className="text-center text-xs text-ink-400">Tracking access available until {formatDateTime(data.expiresAt)}</p>}
      </div>
    </main>
  );
}
