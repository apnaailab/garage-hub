import { useEffect } from 'react';
import { workflowApi, type WorkflowEnvelope } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useWorkflowStore, workflowDataSnapshot, type WorkflowData } from '@/store/useWorkflowStore';

function legacyWorkflowData(): WorkflowData | null {
  try {
    const raw = localStorage.getItem('garagehub-workflow-v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: Partial<WorkflowData> };
    const state = parsed.state;
    if (!state?.job || !state.inventory || !state.crmTasks || !state.attendance) return null;
    return {
      job: state.job,
      inventoryCsvImported: state.inventoryCsvImported ?? false,
      inventory: state.inventory,
      crmTasks: state.crmTasks,
      rewardPoints: state.rewardPoints ?? 0,
      attendance: state.attendance,
      hourlyRate: state.hourlyRate ?? 180,
    };
  } catch {
    return null;
  }
}

export function WorkflowSyncBridge() {
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

    const applyEnvelope = (envelope: WorkflowEnvelope<WorkflowData>) => {
      applyingRemote = true;
      version = envelope.version;
      useWorkflowStore.getState().applyRemote(envelope.data, envelope.version);
      lastSerialized = JSON.stringify(envelope.data);
      dirty = false;
      applyingRemote = false;
    };

    const save = async () => {
      if (disposed || !initialized) return;
      const data = workflowDataSnapshot();
      const sentSerialized = JSON.stringify(data);
      dirty = true;
      useWorkflowStore.getState().setSyncState('saving', 'Saving changes for all organization users…');
      try {
        const result = await workflowApi.save(version, data);
        if (disposed) return;
        if (!result.ok) {
          applyEnvelope(result.conflict);
          useWorkflowStore.getState().setSyncState('conflict', 'Another user saved first. Their latest organization data was loaded.', result.conflict.version);
          return;
        }
        version = result.envelope.version;
        useWorkflowStore.getState().setSyncState('synced', 'Organization data is synchronized.', version);
        const currentSerialized = JSON.stringify(workflowDataSnapshot());
        dirty = currentSerialized !== sentSerialized;
        if (dirty) {
          window.clearTimeout(saveTimer);
          saveTimer = window.setTimeout(() => void save(), 150);
        }
      } catch {
        if (!disposed) useWorkflowStore.getState().setSyncState('offline', 'Backend unavailable. Changes are not yet shared.');
      }
    };

    const unsubscribe = useWorkflowStore.subscribe(() => {
      if (!initialized || applyingRemote) return;
      const serialized = JSON.stringify(workflowDataSnapshot());
      if (serialized === lastSerialized) return;
      lastSerialized = serialized;
      dirty = true;
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => void save(), 250);
    });

    const initialize = async () => {
      useWorkflowStore.getState().setSyncState('loading', 'Loading organization workflow…');
      try {
        const remote = await workflowApi.get<WorkflowData>();
        if (disposed) return;
        if (remote) {
          applyEnvelope(remote);
        } else {
          const legacy = legacyWorkflowData();
          if (legacy) {
            applyingRemote = true;
            useWorkflowStore.getState().applyRemote(legacy, 0);
            applyingRemote = false;
          }
          const data = workflowDataSnapshot();
          const created = await workflowApi.save(0, data);
          if (created.ok) {
            applyEnvelope(created.envelope);
            localStorage.removeItem('garagehub-workflow-v1');
          } else {
            applyEnvelope(created.conflict);
          }
        }
        initialized = true;
      } catch {
        applyingRemote = false;
        initialized = true;
        useWorkflowStore.getState().setSyncState('offline', 'Backend unavailable. Workflow sharing is paused.');
      }
    };

    void initialize();
    const pollTimer = window.setInterval(async () => {
      if (disposed || !initialized || dirty) return;
      try {
        const remote = await workflowApi.get<WorkflowData>();
        if (remote && remote.version > version) applyEnvelope(remote);
      } catch {
        useWorkflowStore.getState().setSyncState('offline', 'Backend unavailable. Workflow sharing is paused.');
      }
    }, 1500);

    return () => {
      disposed = true;
      unsubscribe();
      window.clearInterval(pollTimer);
      window.clearTimeout(saveTimer);
    };
  }, [organizationId]);

  return null;
}
