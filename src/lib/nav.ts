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
} from 'lucide-react';

export interface NavItem {
  page: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: Record<Role, NavItem[]> = {
  owner: [
    { page: 'operations', label: 'Command Center', icon: Activity },
    { page: 'staff', label: 'Staff & Access', icon: Users },
  ],
  manager: [
    { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { page: 'board', label: 'Service Board', icon: KanbanSquare },
    { page: 'vehicles', label: 'Vehicle History', icon: Car },
    { page: 'staff', label: 'Staff & Reports', icon: Users },
  ],
  receptionist: [
    { page: 'intake', label: 'Express Intake', icon: ClipboardPlus },
    { page: 'jobcards', label: 'Job Cards', icon: FileText },
    { page: 'vehicles', label: 'Vehicle History', icon: Car },
    { page: 'scheduler', label: 'Pickup & Drop', icon: Truck },
  ],
  driver: [
    { page: 'operations', label: 'Pickup & Delivery', icon: Truck },
  ],
  mechanic: [
    { page: 'tasks', label: 'My Tasks', icon: ListChecks },
  ],
  'head-mechanic': [
    { page: 'operations', label: 'Quality Queue', icon: ListChecks },
  ],
  accountant: [
    { page: 'billing', label: 'Billing', icon: Wallet },
    { page: 'parts', label: 'Parts Approvals', icon: PackageCheck },
    { page: 'vehicles', label: 'Vehicle History', icon: Car },
  ],
  washing: [
    { page: 'operations', label: 'Washing Queue', icon: ListChecks },
  ],
  'wheel-alignment': [
    { page: 'operations', label: 'WA / WB Queue', icon: ListChecks },
  ],
  crm: [
    { page: 'operations', label: 'CRM Reminders', icon: Activity },
  ],
  customer: [
    { page: 'tracker', label: 'Live Tracker', icon: Car },
    { page: 'approval', label: 'Approvals & Invoice', icon: Receipt },
  ],
};
