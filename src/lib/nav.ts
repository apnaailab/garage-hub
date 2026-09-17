import type { Role } from '@/types';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  ClipboardPlus,
  FileText,
  Truck,
  ListChecks,
  Car,
  Receipt,
  Wallet,
  PackageCheck,
  Activity,
  Workflow,
} from 'lucide-react';

export interface NavItem {
  page: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: Record<Role, NavItem[]> = {
  owner: [
    { page: 'operations', label: 'Command Center', icon: Activity },
    { page: 'workflow', label: 'Workflow Studio', icon: Workflow },
  ],
  manager: [
    { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { page: 'workflow', label: 'Workflow Studio', icon: Workflow },
    { page: 'board', label: 'Service Board', icon: KanbanSquare },
    { page: 'vehicles', label: 'Vehicle History', icon: Car },
    { page: 'staff', label: 'Staff & Reports', icon: Users },
  ],
  receptionist: [
    { page: 'intake', label: 'Express Intake', icon: ClipboardPlus },
    { page: 'workflow', label: 'Workflow Studio', icon: Workflow },
    { page: 'jobcards', label: 'Job Cards', icon: FileText },
    { page: 'vehicles', label: 'Vehicle History', icon: Car },
    { page: 'scheduler', label: 'Pickup & Drop', icon: Truck },
  ],
  driver: [
    { page: 'operations', label: 'Pickup & Delivery', icon: Truck },
    { page: 'workflow', label: 'Workflow Studio', icon: Workflow },
  ],
  mechanic: [
    { page: 'tasks', label: 'My Tasks', icon: ListChecks },
    { page: 'workflow', label: 'Workflow Studio', icon: Workflow },
  ],
  'head-mechanic': [
    { page: 'operations', label: 'Quality Queue', icon: ListChecks },
    { page: 'workflow', label: 'Workflow Studio', icon: Workflow },
  ],
  accountant: [
    { page: 'billing', label: 'Billing', icon: Wallet },
    { page: 'workflow', label: 'Workflow Studio', icon: Workflow },
    { page: 'parts', label: 'Parts Approvals', icon: PackageCheck },
    { page: 'vehicles', label: 'Vehicle History', icon: Car },
  ],
  washing: [
    { page: 'operations', label: 'Washing Queue', icon: ListChecks },
    { page: 'workflow', label: 'Workflow Studio', icon: Workflow },
  ],
  'wheel-alignment': [
    { page: 'operations', label: 'WA / WB Queue', icon: ListChecks },
    { page: 'workflow', label: 'Workflow Studio', icon: Workflow },
  ],
  crm: [
    { page: 'operations', label: 'CRM Reminders', icon: Activity },
    { page: 'workflow', label: 'Workflow Studio', icon: Workflow },
  ],
  customer: [
    { page: 'tracker', label: 'Live Tracker', icon: Car },
    { page: 'workflow', label: 'Workflow Studio', icon: Workflow },
    { page: 'approval', label: 'Approvals & Invoice', icon: Receipt },
  ],
};
