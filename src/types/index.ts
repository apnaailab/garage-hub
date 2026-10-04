// ---------------------------------------------------------------------------
// GarageHub · Core domain types
// ---------------------------------------------------------------------------

export type Role =
  | 'admin'
  | 'owner'
  | 'manager'
  | 'driver'
  | 'mechanic'
  | 'head-mechanic'
  | 'accountant'
  | 'washing'
  | 'wheel-alignment'
  | 'crm'
  | 'customer';

export type StageId =
  | 'entry'
  | 'estimate'
  | 'in-progress'
  | 'final-jobs'
  | 'quality-check'
  | 'billing'
  | 'delivered';

export interface Stage {
  id: StageId;
  label: string;
  description: string;
}

export type ServiceCategory =
  | 'body-paint'
  | 'detailing'
  | 'maintenance'
  | 'commercial';

export interface ServiceType {
  id: string;
  name: string;
  category: ServiceCategory;
  /** Base estimate in the local currency. */
  price: number;
  /** Estimated hours of labour. */
  estimatedHours: number;
  /** Ordered workflow this service typically follows. */
  workflow: StageId[];
  requiresInsuranceDoc?: boolean;
}

export type StaffRole = 'mechanic' | 'detailer' | 'painter' | 'electrician';

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  avatarColor: string;
  /** 0-100 efficiency rating derived from completed jobs. */
  efficiency: number;
  activeJobs: number;
  completedJobs: number;
  available: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export type PhotoTag = 'entry' | 'exterior' | 'interior' | 'in-progress' | 'final' | 'damage';

export interface Photo {
  id: string;
  url: string;
  tag: PhotoTag;
  caption?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface PartRequest {
  id: string;
  name: string;
  quantity: number;
  price: number;
  approved: boolean | null; // null = pending accountant approval
  notedBy: string;
  /** Out-of-stock parts trigger a WhatsApp supplier enquiry. */
  inStock?: boolean;
  installed?: boolean;
}

export type NotifyChannel = 'sms' | 'whatsapp' | 'call' | 'system';
export type NotifyTo = 'customer' | 'driver' | 'manager' | 'owner' | 'accountant';

export interface Notification {
  id: string;
  at: string;
  channel: NotifyChannel;
  to: NotifyTo;
  message: string;
}

export interface WorkNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export type DamageType = 'scratch' | 'dent' | 'crack' | 'peeling' | 'rust';

export interface DamageMarker {
  id: string;
  x: number; // % coordinate on the car diagram
  y: number;
  type: DamageType;
  note?: string;
}

export type FuelLevel = 'E' | '1/4' | '1/2' | '3/4' | 'F';

export type JobPriority = 'low' | 'normal' | 'high';
export type IntakeScenario = 'existing-walk-in' | 'existing-pickup' | 'new-walk-in' | 'new-pickup';
export type InsuranceType = 'zero-depreciation' | 'comprehensive' | 'third-party' | 'no-valid-insurance';
export type ConsentLanguage = 'english' | 'hindi' | 'marathi' | 'kannada';
export type VehicleItemCondition = 'present' | 'missing' | 'damaged';

export interface VehicleItemRecord {
  name: string;
  condition: VehicleItemCondition;
  note?: string;
}

/** Per-service progress a mechanic can set on the task view. */
export type ServiceWorkStatus = 'pending' | 'in-progress' | 'complete' | 'blocked';

export interface JobCard {
  id: string;
  vehicleNo: string;
  make: string;
  model: string;
  year: number;
  color: string;
  fuelLevel: FuelLevel;
  odometer: number;
  customerId: string;
  serviceIds: string[];
  /** Progress per service id. Missing entries default to 'pending'. */
  serviceStatus?: Record<string, ServiceWorkStatus>;
  currentStage: StageId;
  stageHistory: { stage: StageId; at: string }[];
  assignedStaffId?: string;
  priority: JobPriority;
  intakeScenario?: IntakeScenario;
  insuranceType?: InsuranceType;
  consentLanguage?: ConsentLanguage;
  vehicleItems?: VehicleItemRecord[];
  damageMarkers: DamageMarker[];
  photos: Photo[];
  parts: PartRequest[];
  notes: WorkNote[];
  createdAt: string;
  estimatedDelivery: string;
  advanceApproved: boolean;
  extraWorkApproved: boolean | null; // null = awaiting customer
  paid: boolean;
  // --- Workshop workflow ---
  /** Customer's reported concerns / complaints captured at intake. */
  customerConcerns?: string;
  /** How the customer heard about the workshop. */
  referralSource?: string;
  /** When the manager will hand the primary estimate (ISO). */
  estimateReadyBy?: string;
  /** Pending departments after main work, e.g. ['washing','wheel-alignment']. */
  pendingWork?: string[];
  paymentMode?: 'cash' | 'card' | 'upi' | 'bank';
  /** Gate pass is only issued once payment is complete. */
  gatePassIssued?: boolean;
  notifications?: Notification[];
  insuranceClaim?: {
    provider: string;
    claimNo: string;
    docUploaded: boolean;
  };
  pickupDrop?: {
    type: 'pickup' | 'drop' | 'both';
    address: string;
    driverId?: string;
    scheduledAt: string;
    status: 'scheduled' | 'en-route' | 'completed';
  };
}
