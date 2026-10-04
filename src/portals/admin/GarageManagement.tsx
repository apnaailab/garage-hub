import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Archive, ImageMinus, ImagePlus, Pencil, Plus, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { GarageMark } from '@/components/shared/GarageMark';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { organizationsApi, type OrganizationSummary } from '@/lib/api';
import { compressImage } from '@/lib/images';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

export function GarageManagement() {
  const organizations = useAuthStore((state) => state.organizations);
  const currentOrganizationId = useAuthStore((state) => state.user?.organizationId);
  const loadOrganizations = useAuthStore((state) => state.loadOrganizations);
  const loadGarageName = useAuthStore((state) => state.loadGarageName);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<OrganizationSummary | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [logoTarget, setLogoTarget] = useState<OrganizationSummary | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = async (refreshIdentity = false) => {
    await loadOrganizations();
    if (refreshIdentity) await loadGarageName();
  };

  const openCreate = () => {
    setEditing(null);
    setName('');
    setError('');
    setModal('create');
  };

  const openEdit = (organization: OrganizationSummary) => {
    setEditing(organization);
    setName(organization.name);
    setError('');
    setModal('edit');
  };

  const saveGarage = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (modal === 'edit' && editing) {
        await organizationsApi.update(editing.id, name);
        await refresh(editing.id === currentOrganizationId);
        setMessage(`${name.trim()} was updated.`);
      } else {
        await organizationsApi.create(name);
        await refresh();
        setMessage(`${name.trim()} was created. Add its first Owner from Staff & Access.`);
      }
      setModal(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save this garage.');
    } finally {
      setSaving(false);
    }
  };

  const setArchived = async (organization: OrganizationSummary, archived: boolean) => {
    const action = archived ? 'archive' : 'restore';
    if (archived && !window.confirm(`Archive ${organization.name}? Its data will be preserved, but its users will not be able to sign in.`)) return;
    setBusyId(organization.id);
    setError('');
    try {
      await organizationsApi.setArchived(organization.id, archived);
      await refresh();
      setMessage(`${organization.name} was ${archived ? 'archived' : 'restored'}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Unable to ${action} this garage.`);
    } finally {
      setBusyId(null);
    }
  };

  const chooseLogo = (organization: OrganizationSummary) => {
    setLogoTarget(organization);
    fileInput.current?.click();
  };

  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !logoTarget) return;
    setBusyId(logoTarget.id);
    setError('');
    try {
      const compressedLogo = await compressImage(file, 1024, 0.72, 'image/webp');
      await organizationsApi.uploadLogo(logoTarget.id, compressedLogo);
      await refresh(logoTarget.id === currentOrganizationId);
      setMessage(`${logoTarget.name} logo was updated.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to upload this logo.');
    } finally {
      setBusyId(null);
      setLogoTarget(null);
    }
  };

  const removeLogo = async (organization: OrganizationSummary) => {
    if (!window.confirm(`Remove the logo for ${organization.name}?`)) return;
    setBusyId(organization.id);
    setError('');
    try {
      await organizationsApi.removeLogo(organization.id);
      await refresh(organization.id === currentOrganizationId);
      setMessage(`${organization.name} now uses the default garage icon.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to remove this logo.');
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = organizations.filter((organization) => !organization.archived).length;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <PageHeader title="Garages" subtitle="Create and maintain garage workspaces" actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Create garage</Button>} />

      <div className="mb-5 flex flex-wrap items-center gap-4 text-sm text-ink-500">
        <span><strong className="text-ink-900 dark:text-ink-100">{activeCount}</strong> active</span>
        <span><strong className="text-ink-900 dark:text-ink-100">{organizations.length - activeCount}</strong> archived</span>
        <span><strong className="text-ink-900 dark:text-ink-100">{organizations.reduce((total, organization) => total + organization.activeUserCount, 0)}</strong> users</span>
      </div>

      {error && <p className="mb-4 border-l-2 border-rose-500 pl-3 text-sm text-rose-600">{error}</p>}
      {message && <p className="mb-4 border-l-2 border-emerald-500 pl-3 text-sm text-emerald-600">{message}</p>}

      <Card className="overflow-hidden rounded-lg">
        <div className="hidden grid-cols-[minmax(240px,1fr)_110px_110px_180px] gap-4 border-b border-ink-100 bg-ink-50 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:border-ink-800 dark:bg-ink-950/40 md:grid">
          <span>Garage</span><span>Owners</span><span>Users</span><span className="text-right">Actions</span>
        </div>
        {organizations.map((organization) => {
          const busy = busyId === organization.id;
          const selected = organization.id === currentOrganizationId;
          return (
            <div key={organization.id} className={cn('grid gap-4 border-b border-ink-100 px-5 py-4 last:border-0 dark:border-ink-800 md:grid-cols-[minmax(240px,1fr)_110px_110px_180px] md:items-center', organization.archived && 'bg-ink-50/70 opacity-70 dark:bg-ink-950/30')}>
              <div className="flex min-w-0 items-center gap-3">
                <GarageMark logoUrl={organization.logoUrl} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold">{organization.name}</p>{selected && <Badge tone="blue">Selected</Badge>}{organization.archived && <Badge>Archived</Badge>}</div>
                  <p className="truncate text-xs text-ink-400">{organization.slug}</p>
                </div>
              </div>
              <div className="text-sm"><span className="mr-2 text-xs text-ink-400 md:hidden">Owners</span><strong>{organization.ownerCount}</strong></div>
              <div className="text-sm"><span className="mr-2 text-xs text-ink-400 md:hidden">Active users</span><strong>{organization.activeUserCount}</strong></div>
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" className="h-9 w-9" title="Edit garage" aria-label={`Edit ${organization.name}`} disabled={busy} onClick={() => openEdit(organization)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-9 w-9" title="Upload logo" aria-label={`Upload logo for ${organization.name}`} disabled={busy} onClick={() => chooseLogo(organization)}><ImagePlus className="h-4 w-4" /></Button>
                {organization.logoUrl && <Button size="icon" variant="ghost" className="h-9 w-9" title="Remove logo" aria-label={`Remove logo for ${organization.name}`} disabled={busy} onClick={() => void removeLogo(organization)}><ImageMinus className="h-4 w-4" /></Button>}
                {organization.archived ? (
                  <Button size="icon" variant="ghost" className="h-9 w-9" title="Restore garage" aria-label={`Restore ${organization.name}`} disabled={busy} onClick={() => void setArchived(organization, false)}><RotateCcw className="h-4 w-4 text-emerald-600" /></Button>
                ) : (
                  <Button size="icon" variant="ghost" className="h-9 w-9" title={selected ? 'Switch garages before archiving' : 'Archive garage'} aria-label={`Archive ${organization.name}`} disabled={busy || selected} onClick={() => void setArchived(organization, true)}><Archive className="h-4 w-4 text-amber-600" /></Button>
                )}
              </div>
            </div>
          );
        })}
        {!organizations.length && <p className="p-8 text-center text-sm text-ink-400">No garages found.</p>}
      </Card>

      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void uploadLogo(event)} />

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit garage' : 'Create garage'} size="sm">
        <form className="space-y-4 p-5" onSubmit={(event) => void saveGarage(event)}>
          <div><Label>Garage name</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Shree auto" required autoFocus /></div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : modal === 'edit' ? 'Save changes' : 'Create garage'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}