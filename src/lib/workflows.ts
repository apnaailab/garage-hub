import type {
  Stage,
  StageId,
  ServiceType,
  ServiceCategory,
  Role,
  ServiceWorkStatus,
  JobCard,
} from '@/types';
import { MIN_EXTERIOR_PHOTOS, MIN_INTERIOR_PHOTOS } from './photoRequirements';

// ---------------------------------------------------------------------------
// Workflow stages (the service pipeline)
// ---------------------------------------------------------------------------

export const STAGES: Stage[] = [
  { id: 'entry', label: 'Entry', description: 'Vehicle checked in & job card created' },
  { id: 'estimate', label: 'Estimate', description: 'Primary check, estimate & customer approval' },
  { id: 'in-progress', label: 'In Progress', description: 'Approved repair work underway' },
  { id: 'final-jobs', label: 'Final Jobs', description: 'Washing / wheel alignment & finishing' },
  { id: 'quality-check', label: 'Final Trial', description: 'Manager trial with the technician' },
  { id: 'billing', label: 'Billing', description: 'Invoice, payment & gate pass' },
  { id: 'delivered', label: 'Delivered', description: 'Handed back / dropped to customer' },
];

export const STAGE_ORDER: StageId[] = STAGES.map((s) => s.id);

export function stageIndex(stage: StageId): number {
  return STAGE_ORDER.indexOf(stage);
}

export function nextStage(stage: StageId): StageId | null {
  const i = stageIndex(stage);
  return i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null;
}

export function prevStage(stage: StageId): StageId | null {
  const i = stageIndex(stage);
  return i > 0 ? STAGE_ORDER[i - 1] : null;
}

export function stageLabel(stage: StageId): string {
  return STAGES.find((s) => s.id === stage)?.label ?? stage;
}

export function stageProgress(stage: StageId): number {
  return Math.round((stageIndex(stage) / (STAGE_ORDER.length - 1)) * 100);
}

// ---------------------------------------------------------------------------
// Service categories & catalogue
// ---------------------------------------------------------------------------

export const CATEGORY_META: Record<
  ServiceCategory,
  { label: string; color: string; icon: string }
> = {
  'body-paint': { label: 'Body & Paint', color: 'rose', icon: 'Paintbrush' },
  detailing: { label: 'Detailing & Care', color: 'sky', icon: 'Sparkles' },
  maintenance: { label: 'Maintenance & Electrical', color: 'amber', icon: 'Wrench' },
  commercial: { label: 'Commercial & Value-Add', color: 'emerald', icon: 'BadgeDollarSign' },
};

const FULL: StageId[] = ['entry', 'estimate', 'in-progress', 'final-jobs', 'quality-check', 'billing', 'delivered'];
const SHORT: StageId[] = ['entry', 'in-progress', 'quality-check', 'billing', 'delivered'];

export const SERVICES: ServiceType[] = [
  // Body & Paint
  { id: 'svc-denting', name: 'Denting & Painting', category: 'body-paint', price: 12000, estimatedHours: 16, workflow: FULL },
  { id: 'svc-accident', name: 'Accidental Claim Repair', category: 'body-paint', price: 35000, estimatedHours: 40, workflow: FULL, requiresInsuranceDoc: true },
  // Detailing & Care
  { id: 'svc-detailing', name: 'Full Detailing', category: 'detailing', price: 6500, estimatedHours: 6, workflow: SHORT },
  { id: 'svc-interior', name: 'Interior Cleaning', category: 'detailing', price: 2500, estimatedHours: 3, workflow: SHORT },
  { id: 'svc-polish', name: 'Exterior Polish', category: 'detailing', price: 3200, estimatedHours: 4, workflow: SHORT },
  { id: 'svc-foam', name: 'Foam Wash', category: 'detailing', price: 800, estimatedHours: 1, workflow: SHORT },
  // Maintenance & Electrical
  { id: 'svc-checkup', name: 'General Checkup', category: 'maintenance', price: 1500, estimatedHours: 2, workflow: FULL },
  { id: 'svc-oil', name: 'Oil Change', category: 'maintenance', price: 3500, estimatedHours: 1, workflow: SHORT },
  { id: 'svc-ac', name: 'AC & Electrical Works', category: 'maintenance', price: 4800, estimatedHours: 5, workflow: FULL },
  { id: 'svc-alignment', name: 'Wheel Alignment & Balancing', category: 'maintenance', price: 2200, estimatedHours: 2, workflow: SHORT },
  // Commercial & Value-Add
  { id: 'svc-accessories', name: 'Accessories Installation', category: 'commercial', price: 5000, estimatedHours: 3, workflow: SHORT },
  { id: 'svc-insurance', name: 'Insurance Renewal', category: 'commercial', price: 15000, estimatedHours: 1, workflow: ['entry', 'in-progress', 'billing', 'delivered'] },
  { id: 'svc-usedcar', name: 'Used Car Inspection', category: 'commercial', price: 2000, estimatedHours: 2, workflow: ['entry', 'estimate', 'delivered'] },
];

export function serviceById(id: string): ServiceType | undefined {
  return SERVICES.find((s) => s.id === id);
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const ROLE_META: Record<Role, { label: string; tagline: string; icon: string }> = {
  admin: { label: 'Admin', tagline: 'Protected account administration', icon: 'ShieldCheck' },
  owner: { label: 'Owner', tagline: 'Approvals, audit & profitability', icon: 'Crown' },
  manager: { label: 'Workshop Manager', tagline: 'Operations command center', icon: 'LayoutDashboard' },
  driver: { label: 'Driver', tagline: 'Pickup, handover & delivery', icon: 'Truck' },
  mechanic: { label: 'Mechanic / Technician', tagline: 'Your assigned tasks', icon: 'Wrench' },
  'head-mechanic': { label: 'Head Mechanic', tagline: 'Trial & quality control', icon: 'ShieldCheck' },
  accountant: { label: 'Accountant', tagline: 'Parts approval & billing', icon: 'Receipt' },
  washing: { label: 'Washing Department', tagline: 'Final cleaning queue', icon: 'Waves' },
  'wheel-alignment': { label: 'Wheel Alignment / Balancing Specialist', tagline: 'Alignment & balancing queue', icon: 'Gauge' },
  crm: { label: 'CRM Executive', tagline: 'Reminders & relationships', icon: 'MessagesSquare' },
  customer: { label: 'Customer', tagline: 'Track your vehicle', icon: 'Car' },
};

// ---------------------------------------------------------------------------
// Pending final-jobs departments
// ---------------------------------------------------------------------------

export const PENDING_WORK_META: Record<string, { label: string; short: string }> = {
  washing: { label: 'Washing', short: 'Wash' },
  'wheel-alignment': { label: 'Wheel Alignment', short: 'WA' },
  detailing: { label: 'Detailing', short: 'Detail' },
  polishing: { label: 'Polishing', short: 'Polish' },
};

// ---------------------------------------------------------------------------
// Per-service work status (mechanic task tracking)
// ---------------------------------------------------------------------------

export const SERVICE_STATUS_ORDER: ServiceWorkStatus[] = [
  'pending',
  'in-progress',
  'complete',
  'blocked',
];

export const SERVICE_STATUS_META: Record<
  ServiceWorkStatus,
  { label: string; icon: string; badge: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    icon: 'CircleDashed',
    badge: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
    dot: 'bg-ink-400',
  },
  'in-progress': {
    label: 'In Progress',
    icon: 'CirclePlay',
    badge: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
    dot: 'bg-brand-500',
  },
  complete: {
    label: 'Complete',
    icon: 'CircleCheck',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  blocked: {
    label: 'Blocked',
    icon: 'CircleSlash',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
};

export function serviceStatusOf(
  serviceStatus: Record<string, ServiceWorkStatus> | undefined,
  serviceId: string,
): ServiceWorkStatus {
  return serviceStatus?.[serviceId] ?? 'pending';
}

// ---------------------------------------------------------------------------
// Stage-specific task checklists (mechanic workflow)
// ---------------------------------------------------------------------------

export interface StageTask {
  id: string;
  label: string;
  hint?: string;
}

/** Standard tasks per stage. The 'in-progress' stage is filled from the job's services. */
const STAGE_TASK_TEMPLATES: Record<StageId, { label: string; hint?: string }[]> = {
  entry: [
    { label: 'Verify vehicle & customer details' },
    { label: 'Record customer concerns' },
    { label: `Capture ${MIN_EXTERIOR_PHOTOS} exterior photos`, hint: 'mandatory' },
    { label: `Capture ${MIN_INTERIOR_PHOTOS} interior photo`, hint: 'mandatory' },
    { label: 'Assign a technician' },
  ],
  estimate: [
    { label: 'Primary inspection by technician' },
    { label: 'Prepare estimate (parts + labour)' },
    { label: 'Owner approves the estimate' },
    { label: 'Send estimate to customer' },
    { label: 'Customer approval received' },
  ],
  'in-progress': [], // derived from the job's selected services
  'final-jobs': [
    { label: 'Washing & vacuum' },
    { label: 'Wheel alignment & balancing' },
    { label: 'Final detailing / polish' },
  ],
  'quality-check': [
    { label: 'Final trial with technician' },
    { label: 'Manager sign-off' },
    { label: 'Capture final finish photos' },
  ],
  billing: [
    { label: 'Confirm parts installed' },
    { label: 'Verify labour charges' },
    { label: 'Send invoice to customer' },
    { label: 'Confirm payment received' },
    { label: 'Issue gate pass' },
  ],
  delivered: [
    { label: 'Hand over vehicle & keys' },
    { label: 'Notify customer car has left (drop-off)' },
  ],
};

/**
 * Tasks the mechanic works through for a job at a given stage.
 * During 'in-progress' the tasks are the actual services; other stages use a
 * standard checklist. Task ids are stable so their status persists per stage.
 */
export function getStageTasks(job: JobCard, stage: StageId): StageTask[] {
  if (stage === 'in-progress') {
    return job.serviceIds.map((id) => {
      const svc = serviceById(id);
      return { id, label: svc?.name ?? id, hint: svc ? `${svc.estimatedHours}h` : undefined };
    });
  }
  return STAGE_TASK_TEMPLATES[stage].map((t, i) => ({
    id: `${stage}-${i}`,
    label: t.label,
    hint: t.hint,
  }));
}

