import { create } from 'zustand';
import { MIN_EXTERIOR_PHOTOS, MIN_INTERIOR_PHOTOS } from '@/lib/photoRequirements';

export const WORKFLOW_STAGES = [
  'pending-for-pickup',
  'pending-from-technician',
  'pending-for-estimate',
  'pending-for-customer-approval',
  'pending-for-parts',
  'pending-from-accountant',
  'pending-for-payment',
  'pending-for-drop-off',
  'delivered',
] as const;
export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];
export type CheckStatus = 'unchecked' | 'good' | 'replace-now' | 'replace-later';

export interface LocalDocument { id: string; type: 'rc' | 'insurance' | 'puc' | 'job-card' | 'driver-license'; name: string; dataUrl?: string; uploadedAt: string }
export interface LocalConsent { kind: string; language: string; signer: string; signedAt: string }
export interface CheckLine { id: string; name: string; status: CheckStatus; interval?: string; photoName?: string }
export interface EstimatePart { id: string; name: string; urgency: 'red' | 'orange'; quantity: number; customerSelected: boolean; inStock: boolean; unitPrice: number; unitCost: number; leadDays: number; inquirySent: boolean; ordered: boolean; received: boolean }
export interface DepartmentTask { status: 'not-required' | 'pending' | 'in-progress' | 'complete'; etaMinutes: number }
export interface WorkflowNotice { id: string; to: string; message: string; at: string }
export interface CrmTask { id: string; kind: string; customer: string; due: string; done: boolean }
export interface AttendanceEvent { id: string; employee: string; type: 'login' | 'lunch-out' | 'lunch-in' | 'logout'; at: string }

export interface WorkflowJob {
  id: string;
  vehicleNo: string;
  customer: string;
  stage: WorkflowStage;
  insuranceType: 'zero-depreciation' | 'comprehensive' | 'third-party' | 'no-valid-insurance';
  language: 'english' | 'hindi' | 'marathi' | 'kannada';
  documents: LocalDocument[];
  consents: LocalConsent[];
  driver: string;
  driverPhoto: string;
  driverLicenseName: string;
  address: string;
  phone: string;
  pickupStatus: 'scheduled' | 'en-route' | 'at-customer' | 'picked-up' | 'at-workshop';
  driverEtaMinutes: number;
  exteriorPhotos: number;
  interiorPhotos: number;
  handoverSigned: boolean;
  technicianAccepted: boolean;
  activeWorkStartedAt?: string;
  accumulatedWorkMinutes: number;
  checklist: CheckLine[];
  parts: EstimatePart[];
  labour: number;
  estimateSubmitted: boolean;
  termsAccepted: boolean;
  customerApproved: boolean;
  ownerApproved: boolean;
  leaveCarForParts: boolean;
  advancePaid: boolean;
  washing: DepartmentTask;
  alignment: DepartmentTask;
  workshopClosed: boolean;
  invoiceType: 'gst' | 'general';
  invoiceNumber: string;
  invoiceAccountantApproved: boolean;
  invoiceManagerApproved: boolean;
  invoiceOwnerApproved: boolean;
  paymentMode: 'cash' | 'card' | 'upi' | 'bank' | 'credit-drop';
  paid: boolean;
  gatePassIssued: boolean;
  cashReceivedByDriver: boolean;
  notifications: WorkflowNotice[];
}

export interface WorkflowData {
  job: WorkflowJob;
  inventoryCsvImported: boolean;
  inventory: { sku: string; name: string; quantity: number; lowAt: number; cost: number; price: number }[];
  crmTasks: CrmTask[];
  rewardPoints: number;
  attendance: AttendanceEvent[];
  hourlyRate: number;
}

interface WorkflowState extends WorkflowData {
  lastError: string;
  serverVersion: number;
  syncStatus: 'loading' | 'synced' | 'saving' | 'conflict' | 'offline';
  syncMessage: string;
  updateJob: (patch: Partial<WorkflowJob>) => void;
  addDocument: (document: LocalDocument) => void;
  signConsent: (consent: LocalConsent) => void;
  setCheck: (id: string, status: CheckStatus, interval?: string) => void;
  updatePart: (id: string, patch: Partial<EstimatePart>) => void;
  addPart: (part: EstimatePart) => void;
  addNotice: (to: string, message: string) => void;
  importInventory: (rows: WorkflowState['inventory']) => void;
  completeCrm: (id: string) => void;
  addAttendance: (employee: string, type: AttendanceEvent['type']) => void;
  advance: () => void;
  reset: () => void;
  applyRemote: (data: WorkflowData, version: number) => void;
  setSyncState: (status: WorkflowState['syncStatus'], message?: string, version?: number) => void;
}

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const CHECKLIST = ['Engine oil', 'Oil filter', 'Air filter', 'Coolant', 'Battery', 'Front brakes', 'Rear brakes', 'Tyres', 'Suspension', 'Lights', 'Wipers', 'AC performance'].map((name, index) => ({ id: `check-${index + 1}`, name, status: 'unchecked' as CheckStatus }));

const initialJob = (): WorkflowJob => ({
  id: 'WF-3001', vehicleNo: 'MH14HK2026', customer: 'Hackathon Customer', stage: 'pending-for-pickup',
  insuranceType: 'third-party', language: 'hindi', documents: [], consents: [], driver: 'Deepak Nair',
  driverPhoto: 'https://i.pravatar.cc/160?img=12', driverLicenseName: '', address: 'Innovation Road, Pune', phone: '9876543210',
  pickupStatus: 'scheduled', driverEtaMinutes: 30, exteriorPhotos: 0, interiorPhotos: 0, handoverSigned: false,
  technicianAccepted: false, accumulatedWorkMinutes: 0, checklist: CHECKLIST, parts: [], labour: 2500,
  estimateSubmitted: false, termsAccepted: false, customerApproved: false, ownerApproved: false,
  leaveCarForParts: true, advancePaid: false,
  washing: { status: 'pending', etaMinutes: 30 }, alignment: { status: 'pending', etaMinutes: 45 }, workshopClosed: false,
  invoiceType: 'gst', invoiceNumber: 'GST-2026-0001', invoiceAccountantApproved: false, invoiceManagerApproved: false,
  invoiceOwnerApproved: false, paymentMode: 'upi', paid: false, gatePassIssued: false, cashReceivedByDriver: false,
  notifications: [{ id: 'notice-seed', to: 'manager', message: 'Workflow demo job created.', at: now() }],
});

const initialCrm: CrmTask[] = [
  { id: 'crm-1', kind: 'Insurance renewal · 21 days', customer: 'Hackathon Customer', due: now(), done: false },
  { id: 'crm-2', kind: 'PUC expiry reminder', customer: 'Priya Sharma', due: now(), done: false },
  { id: 'crm-3', kind: 'Birthday greeting', customer: 'Arjun Mehta', due: now(), done: false },
  { id: 'crm-4', kind: 'Google review request', customer: 'Neha Kapoor', due: now(), done: false },
];

function gate(job: WorkflowJob): string | null {
  switch (job.stage) {
    case 'pending-for-pickup': {
      const requiredDocs = job.documents.some((d) => d.type === 'rc') && job.documents.some((d) => d.type === 'insurance');
      const requiredConsents = ['pickup-disclosure', 'pickup-disclaimer', 'insurance-declaration'].every((kind) => job.consents.some((c) => c.kind === kind));
      if (!requiredDocs) return 'Upload RC and insurance documents.';
      if (!requiredConsents) return 'Sign all three pickup disclosures.';
      if (job.pickupStatus !== 'at-workshop') return 'Complete the driver pickup and workshop arrival.';
      if (job.exteriorPhotos < MIN_EXTERIOR_PHOTOS || job.interiorPhotos < MIN_INTERIOR_PHOTOS || !job.handoverSigned) return `Capture ${MIN_EXTERIOR_PHOTOS} exterior, ${MIN_INTERIOR_PHOTOS} interior photo and customer handover signature.`;
      return null;
    }
    case 'pending-from-technician':
      if (!job.technicianAccepted) return 'Technician must accept the assignment.';
      if (job.checklist.some((line) => line.status === 'unchecked')) return 'Every general check-up item must be marked.';
      return null;
    case 'pending-for-estimate':
      if (!job.estimateSubmitted) return 'Workshop Manager must submit the estimate.';
      return null;
    case 'pending-for-customer-approval':
      if (!job.termsAccepted || !job.customerApproved || !job.ownerApproved) return 'Customer terms/approval and final Owner approval are required.';
      return null;
    case 'pending-for-parts': {
      const selected = job.parts.filter((part) => part.customerSelected);
      const waiting = selected.some((part) => !part.inStock && !part.received);
      const needsAdvance = selected.some((part) => part.leadDays > 2) && !job.leaveCarForParts;
      if (needsAdvance && !job.advancePaid) return '100% parts advance is required when the customer takes the vehicle.';
      if (waiting) return 'All selected ordered parts must be received.';
      return null;
    }
    case 'pending-from-accountant':
      if (job.washing.status !== 'complete' || job.alignment.status !== 'complete' || !job.workshopClosed) return 'Department work, final trial and workshop closure are required.';
      if (!job.invoiceAccountantApproved || !job.invoiceManagerApproved || !job.invoiceOwnerApproved) return 'Invoice requires Accountant, Manager and Owner approval.';
      return null;
    case 'pending-for-payment':
      if (!job.paid && job.paymentMode !== 'credit-drop') return 'Payment is required before issuing the gate pass.';
      if (!job.gatePassIssued) return 'Issue a paid or provisional credit gate pass.';
      return null;
    case 'pending-for-drop-off':
      if (job.paymentMode === 'credit-drop' && !job.cashReceivedByDriver) return 'Driver must confirm cash received.';
      return null;
    default:
      return null;
  }
}

const INITIAL_INVENTORY: WorkflowData['inventory'] = [
  { sku: 'OIL-5W30', name: 'Engine Oil 5W30', quantity: 12, lowAt: 5, cost: 420, price: 650 },
  { sku: 'WIPER-24', name: '24-inch Wiper Blade', quantity: 4, lowAt: 5, cost: 280, price: 450 },
];

export const useWorkflowStore = create<WorkflowState>()((set) => ({
  job: initialJob(),
  inventoryCsvImported: false,
  inventory: INITIAL_INVENTORY,
  crmTasks: initialCrm,
  rewardPoints: 100,
  attendance: [],
  hourlyRate: 180,
  lastError: '',
  serverVersion: 0,
  syncStatus: 'loading',
  syncMessage: 'Loading organization workflow…',
  updateJob: (patch) => set((state) => ({ job: { ...state.job, ...patch }, lastError: '' })),
  addDocument: (document) => set((state) => ({ job: { ...state.job, documents: [...state.job.documents, document] }, lastError: '' })),
  signConsent: (consent) => set((state) => ({ job: { ...state.job, consents: [...state.job.consents.filter((c) => c.kind !== consent.kind), consent] }, lastError: '' })),
  setCheck: (checkId, status, interval) => set((state) => ({ job: { ...state.job, checklist: state.job.checklist.map((line) => line.id === checkId ? { ...line, status, interval } : line) }, lastError: '' })),
  updatePart: (partId, patch) => set((state) => ({ job: { ...state.job, parts: state.job.parts.map((part) => part.id === partId ? { ...part, ...patch } : part) }, lastError: '' })),
  addPart: (part) => set((state) => ({ job: { ...state.job, parts: [...state.job.parts, part] }, lastError: '' })),
  addNotice: (to, message) => set((state) => ({ job: { ...state.job, notifications: [{ id: id('notice'), to, message, at: now() }, ...state.job.notifications] } })),
  importInventory: (rows) => set({ inventory: rows, inventoryCsvImported: true }),
  completeCrm: (crmId) => set((state) => ({ crmTasks: state.crmTasks.map((task) => task.id === crmId ? { ...task, done: true } : task), rewardPoints: state.rewardPoints + 10 })),
  addAttendance: (employee, type) => set((state) => ({ attendance: [{ id: id('att'), employee, type, at: now() }, ...state.attendance] })),
  advance: () => set((state) => {
    const problem = gate(state.job);
    if (problem) return { lastError: problem };
    const index = WORKFLOW_STAGES.indexOf(state.job.stage);
    if (index >= WORKFLOW_STAGES.length - 1) return { lastError: '' };
    const stage = WORKFLOW_STAGES[index + 1];
    return {
      job: {
        ...state.job,
        stage,
        notifications: [{ id: id('notice'), to: 'all relevant actors', message: `Job moved to ${stage.split('-').join(' ')}.`, at: now() }, ...state.job.notifications],
      },
      lastError: '',
    };
  }),
  reset: () => set({ job: initialJob(), inventoryCsvImported: false, inventory: INITIAL_INVENTORY, crmTasks: initialCrm, rewardPoints: 100, attendance: [], hourlyRate: 180, lastError: '' }),
  applyRemote: (data, version) => set({ ...data, serverVersion: version, syncStatus: 'synced', syncMessage: 'Organization data is synchronized.' }),
  setSyncState: (syncStatus, syncMessage = '', serverVersion) => set((state) => ({ syncStatus, syncMessage, serverVersion: serverVersion ?? state.serverVersion })),
}));

export function workflowDataSnapshot(): WorkflowData {
  const state = useWorkflowStore.getState();
  return {
    job: state.job,
    inventoryCsvImported: state.inventoryCsvImported,
    inventory: state.inventory,
    crmTasks: state.crmTasks,
    rewardPoints: state.rewardPoints,
    attendance: state.attendance,
    hourlyRate: state.hourlyRate,
  };
}
