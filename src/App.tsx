import { useState, useCallback, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from '@/components/layout/AppShell';
import { PrintJobCard } from '@/components/shared/PrintJobCard';
import { Login } from '@/components/auth/Login';

import { Dashboard } from '@/portals/manager/Dashboard';
import { ServiceBoard } from '@/portals/manager/ServiceBoard';
import { StaffManagement } from '@/portals/manager/StaffManagement';
import { Intake } from '@/portals/receptionist/Intake';
import { JobCards } from '@/portals/receptionist/JobCards';
import { Vehicles } from '@/portals/receptionist/Vehicles';
import { Scheduler } from '@/portals/receptionist/Scheduler';
import { TaskView } from '@/portals/mechanic/TaskView';
import { Billing, PartsApprovals } from '@/portals/accountant/Billing';
import { Tracker } from '@/portals/customer/Tracker';
import { Approval } from '@/portals/customer/Approval';
import { OperationsCenter } from '@/portals/shared/OperationsCenter';
import { PortalSyncBridge } from '@/components/shared/PortalSyncBridge';
import type { Role } from '@/types';

export default function App() {
  const role = useStore((s) => s.role);
  const setRole = useStore((s) => s.setRole);
  const page = useStore((s) => s.page);
  const user = useAuthStore((s) => s.user);
  const restore = useAuthStore((s) => s.restore);
  const [printJobId, setPrintJobId] = useState<string | null>(null);

  useEffect(() => { void restore(); }, [restore]);
  useEffect(() => {
    if (user) setRole(user.role as Role);
  }, [user, setRole]);

  const onPrint = useCallback((id: string) => setPrintJobId(id), []);

  const renderPage = () => {
    if (role === 'driver' || role === 'head-mechanic' || role === 'washing' || role === 'wheel-alignment' || role === 'crm') {
      return <OperationsCenter />;
    }
    if (role === 'owner' || role === 'manager') {
      if (page === 'board') return <ServiceBoard onPrint={onPrint} />;
      if (page === 'vehicles') return <Vehicles onPrint={onPrint} />;
      if (page === 'staff') return <StaffManagement onPrint={onPrint} />;
      return <Dashboard onPrint={onPrint} />;
    }
    if (role === 'receptionist') {
      if (page === 'jobcards') return <JobCards onPrint={onPrint} />;
      if (page === 'vehicles') return <Vehicles onPrint={onPrint} />;
      if (page === 'scheduler') return <Scheduler />;
      return <Intake onPrint={onPrint} />;
    }
    if (role === 'mechanic') {
      return <TaskView />;
    }
    if (role === 'accountant') {
      if (page === 'parts') return <PartsApprovals />;
      if (page === 'vehicles') return <Vehicles onPrint={onPrint} />;
      return <Billing />;
    }
    // customer
    if (page === 'approval') return <Approval />;
    return <Tracker />;
  };

  if (!user) return <Login />;

  return (
    <>
      <PortalSyncBridge />
      <AppShell>{renderPage()}</AppShell>
      {printJobId && <PrintJobCard jobId={printJobId} onDone={() => setPrintJobId(null)} />}
    </>
  );
}
