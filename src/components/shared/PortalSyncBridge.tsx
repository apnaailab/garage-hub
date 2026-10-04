import { useEffect } from 'react';
import { portalApi, type WorkflowEnvelope } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { portalDataSnapshot, useStore, type PortalData } from '@/store/useStore';

const EMPTY_PORTAL_DATA: PortalData = { jobs: [], staff: [], customers: [] };

export function PortalSyncBridge() {
  const organizationId = useAuthStore((state) => state.user?.organizationId);

  useEffect(() => {
    if (!organizationId) return;

    let disposed = false;
    let initialized = false;
    let applyingRemote = true;
    let dirty = false;
    let version = 0;
    let lastSerialized = '';
    let saveTimer: number | undefined;

    const applyEnvelope = (envelope: WorkflowEnvelope<PortalData>) => {
      applyingRemote = true;
      version = envelope.version;
      useStore.getState().applyRemote(envelope.data, envelope.version);
      lastSerialized = JSON.stringify(envelope.data);
      dirty = false;
      applyingRemote = false;
    };

    const save = async () => {
      if (disposed || !initialized) return;
      const data = portalDataSnapshot();
      const sentSerialized = JSON.stringify(data);
      dirty = true;
      useStore.getState().setSyncState('saving', 'Saving organization data…');
      try {
        const result = await portalApi.save(version, data);
        if (disposed) return;
        if (!result.ok) {
          applyEnvelope(result.conflict);
          useStore.getState().setSyncState('conflict', 'Another user saved first. Their latest data was loaded.', result.conflict.version);
          return;
        }
        version = result.envelope.version;
        useStore.getState().setSyncState('synced', 'Organization data is synchronized.', version);
        const currentSerialized = JSON.stringify(portalDataSnapshot());
        dirty = currentSerialized !== sentSerialized;
        if (dirty) saveTimer = window.setTimeout(() => void save(), 150);
      } catch {
        if (!disposed) useStore.getState().setSyncState('offline', 'Backend unavailable. Changes are not yet shared.');
      }
    };

    applyingRemote = true;
    useStore.getState().applyRemote(EMPTY_PORTAL_DATA, 0);
    useStore.getState().setSyncState('loading', 'Loading organization data…', 0);
    applyingRemote = false;
    localStorage.removeItem('garagehub-store');

    const unsubscribe = useStore.subscribe(() => {
      if (!initialized || applyingRemote) return;
      const serialized = JSON.stringify(portalDataSnapshot());
      if (serialized === lastSerialized) return;
      lastSerialized = serialized;
      dirty = true;
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => void save(), 250);
    });

    const initialize = async () => {
      try {
        const remote = await portalApi.get<PortalData>();
        if (disposed) return;
        if (remote) {
          applyEnvelope(remote);
        } else {
          const created = await portalApi.save(0, EMPTY_PORTAL_DATA);
          if (disposed) return;
          if (created.ok) applyEnvelope(created.envelope);
          else applyEnvelope(created.conflict);
        }
        initialized = true;
      } catch {
        initialized = true;
        useStore.getState().setSyncState('offline', 'Backend unavailable. Organization data could not be loaded.');
      }
    };

    void initialize();
    const pollTimer = window.setInterval(async () => {
      if (disposed || !initialized || dirty) return;
      try {
        const remote = await portalApi.get<PortalData>();
        if (remote && remote.version > version) applyEnvelope(remote);
      } catch {
        useStore.getState().setSyncState('offline', 'Backend unavailable. Organization synchronization is paused.');
      }
    }, 1500);

    const stopSync = () => {
      disposed = true;
      unsubscribe();
      window.clearInterval(pollTimer);
      window.clearTimeout(saveTimer);
    };
    window.addEventListener('garagehub:session-changing', stopSync, { once: true });

    return () => {
      window.removeEventListener('garagehub:session-changing', stopSync);
      stopSync();
    };
  }, [organizationId]);

  return null;
}
