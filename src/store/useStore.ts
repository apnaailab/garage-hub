import { create } from 'zustand';
import type {
  JobCard,
  Staff,
  StaffRole,
  Customer,
  Role,
  StageId,
  Photo,
  PartRequest,
  WorkNote,
  ServiceWorkStatus,
  Notification,
} from '@/types';
import { nextStage, stageLabel } from '@/lib/workflows';
import { nowISO, uid } from '@/lib/utils';

type Theme = 'light' | 'dark';

export interface PortalData {
  jobs: JobCard[];
  staff: Staff[];
  customers: Customer[];
}

interface GarageState extends PortalData {
  role: Role;
  theme: Theme;
  /** Active nav page within the current role portal. */
  page: string;
  /** Currently focused job (used by customer tracker + detail drawer). */
  activeJobId: string | null;
  /** Currently signed-in mechanic (for the mechanic portal). */
  activeStaffId: string;
  /** Currently signed-in customer (for the customer portal). */
  activeCustomerId: string;
  search: string;

  serverVersion: number;
  syncStatus: 'loading' | 'synced' | 'saving' | 'conflict' | 'offline';
  syncMessage: string;

  // --- UI actions ---
  setRole: (role: Role) => void;
  setPage: (page: string) => void;
  toggleTheme: () => void;
  setActiveJob: (id: string | null) => void;
  setActiveStaff: (id: string) => void;
  setActiveCustomer: (id: string) => void;
  setSearch: (q: string) => void;

  // --- Job actions ---
  addJob: (job: JobCard) => void;
  addCustomer: (customer: Customer) => void;
  addStaff: (staff: Staff) => void;
  syncStaffAccount: (id: string, name: string, role: StaffRole | null) => void;
  advanceStage: (jobId: string) => void;
  setStage: (jobId: string, stage: StageId) => void;
  assignStaff: (jobId: string, staffId: string) => void;
  setServiceStatus: (jobId: string, serviceId: string, status: ServiceWorkStatus) => void;
  addPhoto: (jobId: string, photo: Omit<Photo, 'id' | 'uploadedAt'>) => void;
  addPart: (jobId: string, part: Omit<PartRequest, 'id'>) => void;
  reviewPart: (jobId: string, partId: string, approved: boolean) => void;
  addNote: (jobId: string, note: Omit<WorkNote, 'id' | 'createdAt'>) => void;
  approveExtraWork: (jobId: string, approved: boolean) => void;
  markPaid: (jobId: string, mode?: JobCard['paymentMode']) => void;
  issueGatePass: (jobId: string) => void;
  togglePendingWork: (jobId: string, key: string) => void;
  pushNotification: (jobId: string, notif: Omit<Notification, 'id' | 'at'>) => void;
  updatePickup: (jobId: string, patch: Partial<NonNullable<JobCard['pickupDrop']>>) => void;

  /** Clear the organization portal dataset. */
  resetData: () => void;
  applyRemote: (data: PortalData, version: number) => void;
  setSyncState: (status: GarageState['syncStatus'], message?: string, version?: number) => void;
}

const DEFAULT_PAGE: Record<Role, string> = {
  admin: 'dashboard',
  owner: 'dashboard',
  manager: 'dashboard',
  driver: 'operations',
  mechanic: 'tasks',
  'head-mechanic': 'operations',
  accountant: 'billing',
  washing: 'operations',
  'wheel-alignment': 'operations',
  crm: 'operations',
  customer: 'tracker',
};

/** Customer-facing message auto-sent when a job reaches a stage. */
function stageCustomerMessage(stage: StageId): string {
  switch (stage) {
    case 'entry':
      return 'Your vehicle has been checked in at the workshop.';
    case 'estimate':
      return 'We are preparing your estimate and will share it shortly.';
    case 'in-progress':
      return 'Approved — our technician has started work on your vehicle.';
    case 'final-jobs':
      return 'Main work is done. Final washing & finishing is in progress.';
    case 'quality-check':
      return 'Your vehicle is in the final trial / quality check.';
    case 'billing':
      return 'Work complete — your invoice is ready for payment.';
    case 'delivered':
      return 'Your vehicle has been delivered. Thank you for choosing GarageHub!';
    default:
      return `Status updated to ${stageLabel(stage)}.`;
  }
}

function makeNotification(notif: Omit<Notification, 'id' | 'at'>): Notification {
  return { ...notif, id: uid('ntf'), at: nowISO() };
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
}

export const useStore = create<GarageState>()(
    (set) => ({
      role: 'manager',
      theme: 'light',
      page: 'dashboard',
      activeJobId: null,
      activeStaffId: 'stf-1',
      activeCustomerId: 'cus-1',
      search: '',

      jobs: [],
      staff: [],
      customers: [],
      serverVersion: 0,
      syncStatus: 'loading',
      syncMessage: 'Loading organization data…',

      setRole: (role) => set({ role, page: DEFAULT_PAGE[role], activeJobId: null }),
      setPage: (page) => set({ page }),
      toggleTheme: () =>
        set((s) => {
          const theme = s.theme === 'light' ? 'dark' : 'light';
          applyTheme(theme);
          return { theme };
        }),
      setActiveJob: (activeJobId) => set({ activeJobId }),
      setActiveStaff: (activeStaffId) => set({ activeStaffId }),
      setActiveCustomer: (activeCustomerId) => set({ activeCustomerId }),
      setSearch: (search) => set({ search }),

      addJob: (job) => set((s) => ({ jobs: [job, ...s.jobs] })),

      addCustomer: (customer) => set((s) => ({ customers: [...s.customers, customer] })),

      addStaff: (staff) => set((s) => ({ staff: s.staff.some((item) => item.id === staff.id) ? s.staff : [...s.staff, staff] })),

      syncStaffAccount: (id, name, role) => set((state) => {
        const existing = state.staff.find((member) => member.id === id);
        if (!role) return { staff: state.staff.filter((member) => member.id !== id) };
        if (existing) {
          return { staff: state.staff.map((member) => member.id === id ? { ...member, name, role } : member) };
        }
        return {
          staff: [...state.staff, {
            id,
            name,
            role,
            avatarColor: '#3182f6',
            efficiency: 0,
            activeJobs: 0,
            completedJobs: 0,
            available: true,
          }],
        };
      }),

      advanceStage: (jobId) =>
        set((s) => ({
          jobs: s.jobs.map((j) => {
            if (j.id !== jobId) return j;
            const nxt = nextStage(j.currentStage);
            if (!nxt) return j;
            return {
              ...j,
              currentStage: nxt,
              stageHistory: [...j.stageHistory, { stage: nxt, at: nowISO() }],
              notifications: [
                ...(j.notifications ?? []),
                makeNotification({ channel: 'whatsapp', to: 'customer', message: stageCustomerMessage(nxt) }),
              ],
            };
          }),
        })),

      setStage: (jobId, stage) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  currentStage: stage,
                  stageHistory: [...j.stageHistory, { stage, at: nowISO() }],
                }
              : j,
          ),
        })),

      assignStaff: (jobId, staffId) =>
        set((s) => ({
          jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, assignedStaffId: staffId } : j)),
        })),

      setServiceStatus: (jobId, serviceId, status) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? { ...j, serviceStatus: { ...j.serviceStatus, [serviceId]: status } }
              : j,
          ),
        })),

      addPhoto: (jobId, photo) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? { ...j, photos: [...j.photos, { ...photo, id: uid('ph'), uploadedAt: nowISO() }] }
              : j,
          ),
        })),

      addPart: (jobId, part) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId ? { ...j, parts: [...j.parts, { ...part, id: uid('pt') }] } : j,
          ),
        })),

      reviewPart: (jobId, partId, approved) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? { ...j, parts: j.parts.map((p) => (p.id === partId ? { ...p, approved } : p)) }
              : j,
          ),
        })),

      addNote: (jobId, note) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? { ...j, notes: [...j.notes, { ...note, id: uid('nt'), createdAt: nowISO() }] }
              : j,
          ),
        })),

      approveExtraWork: (jobId, approved) =>
        set((s) => ({
          jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, extraWorkApproved: approved } : j)),
        })),

      markPaid: (jobId, mode) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  paid: true,
                  paymentMode: mode ?? j.paymentMode,
                  notifications: [
                    ...(j.notifications ?? []),
                    makeNotification({
                      channel: 'system',
                      to: 'accountant',
                      message: `Payment received${mode ? ` via ${mode.toUpperCase()}` : ''}. Gate pass can be issued.`,
                    }),
                  ],
                }
              : j,
          ),
        })),

      issueGatePass: (jobId) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId && j.paid
              ? {
                  ...j,
                  gatePassIssued: true,
                  notifications: [
                    ...(j.notifications ?? []),
                    makeNotification({ channel: 'system', to: 'customer', message: 'Gate pass issued — your vehicle is cleared to leave.' }),
                  ],
                }
              : j,
          ),
        })),

      togglePendingWork: (jobId, key) =>
        set((s) => ({
          jobs: s.jobs.map((j) => {
            if (j.id !== jobId) return j;
            const cur = j.pendingWork ?? [];
            return {
              ...j,
              pendingWork: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
            };
          }),
        })),

      pushNotification: (jobId, notif) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? { ...j, notifications: [...(j.notifications ?? []), makeNotification(notif)] }
              : j,
          ),
        })),

      updatePickup: (jobId, patch) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId && j.pickupDrop
              ? { ...j, pickupDrop: { ...j.pickupDrop, ...patch } }
              : j,
          ),
        })),

      resetData: () =>
        set({
          jobs: [],
          staff: [],
          customers: [],
          activeJobId: null,
          search: '',
        }),
      applyRemote: (data, serverVersion) => set({ ...data, serverVersion, syncStatus: 'synced', syncMessage: 'Organization data is synchronized.' }),
      setSyncState: (syncStatus, syncMessage = '', serverVersion) => set((state) => ({ syncStatus, syncMessage, serverVersion: serverVersion ?? state.serverVersion })),
    }),
);

export function portalDataSnapshot(): PortalData {
  const state = useStore.getState();
  return { jobs: state.jobs, staff: state.staff, customers: state.customers };
}

// ---------------------------------------------------------------------------
// Selectors / derived helpers
// ---------------------------------------------------------------------------
export function useJob(jobId: string | null): JobCard | undefined {
  return useStore((s) => s.jobs.find((j) => j.id === jobId));
}

export function customerById(customers: Customer[], id: string): Customer | undefined {
  return customers.find((c) => c.id === id);
}

export function staffById(staff: Staff[], id?: string): Staff | undefined {
  return staff.find((st) => st.id === id);
}
