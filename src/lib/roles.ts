import type { Role } from '@/types';
import type { LucideIcon } from 'lucide-react';
import { Crown, LayoutDashboard, ClipboardList, Truck, Wrench, ShieldCheck, Receipt, Waves, Gauge, MessagesSquare, Car } from 'lucide-react';

export const ROLE_LIST: { role: Role; icon: LucideIcon }[] = [
  { role: 'owner', icon: Crown },
  { role: 'manager', icon: LayoutDashboard },
  { role: 'receptionist', icon: ClipboardList },
  { role: 'driver', icon: Truck },
  { role: 'mechanic', icon: Wrench },
  { role: 'head-mechanic', icon: ShieldCheck },
  { role: 'accountant', icon: Receipt },
  { role: 'washing', icon: Waves },
  { role: 'wheel-alignment', icon: Gauge },
  { role: 'crm', icon: MessagesSquare },
  { role: 'customer', icon: Car },
];
