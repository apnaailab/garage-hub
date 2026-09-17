import type { JobCard, Customer } from '@/types';

export interface VehicleRecord {
  vehicleNo: string;
  make: string;
  model: string;
  year: number;
  color: string;
  /** Customer id from the most recent visit. */
  customerId: string;
  lastOdometer: number;
  lastFuelLevel: JobCard['fuelLevel'];
  visits: number;
  firstVisitAt: string;
  lastVisitAt: string;
  /** Unique mechanic ids that have worked on this vehicle, most recent first. */
  mechanicIds: string[];
  /** All jobs for this vehicle, newest first. */
  jobs: JobCard[];
}

/** Normalise a registration number for comparison (uppercase, no spaces). */
export function normalizeVehicleNo(no: string): string {
  return no.toUpperCase().replace(/\s+/g, '');
}

/**
 * Build a per-vehicle registry from the job history. The most recent job (by
 * createdAt) provides the current vehicle + customer details.
 */
export function buildVehicleRegistry(jobs: JobCard[]): VehicleRecord[] {
  const byNo = new Map<string, JobCard[]>();
  for (const job of jobs) {
    const key = normalizeVehicleNo(job.vehicleNo);
    const list = byNo.get(key);
    if (list) list.push(job);
    else byNo.set(key, [job]);
  }

  const records: VehicleRecord[] = [];
  for (const [vehicleNo, list] of byNo) {
    const sorted = [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const latest = sorted[0];
    const oldest = sorted[sorted.length - 1];
    // Unique mechanics that worked on this vehicle, most recent first.
    const mechanicIds: string[] = [];
    for (const job of sorted) {
      if (job.assignedStaffId && !mechanicIds.includes(job.assignedStaffId)) {
        mechanicIds.push(job.assignedStaffId);
      }
    }
    records.push({
      vehicleNo,
      make: latest.make,
      model: latest.model,
      year: latest.year,
      color: latest.color,
      customerId: latest.customerId,
      lastOdometer: latest.odometer,
      lastFuelLevel: latest.fuelLevel,
      visits: sorted.length,
      firstVisitAt: oldest.createdAt,
      lastVisitAt: latest.createdAt,
      mechanicIds,
      jobs: sorted,
    });
  }

  return records.sort(
    (a, b) => new Date(b.lastVisitAt).getTime() - new Date(a.lastVisitAt).getTime(),
  );
}

/** Find a known vehicle by (normalised) registration number. */
export function findVehicle(jobs: JobCard[], vehicleNo: string): VehicleRecord | undefined {
  const key = normalizeVehicleNo(vehicleNo);
  if (!key) return undefined;
  return buildVehicleRegistry(jobs).find((v) => v.vehicleNo === key);
}

/** Vehicles whose registration number contains the query (for autocomplete). */
export function searchVehicles(jobs: JobCard[], query: string, limit = 6): VehicleRecord[] {
  const q = normalizeVehicleNo(query);
  if (!q) return [];
  return buildVehicleRegistry(jobs)
    .filter((v) => v.vehicleNo.includes(q))
    .slice(0, limit);
}

export function vehicleCustomer(
  customers: Customer[],
  record: VehicleRecord,
): Customer | undefined {
  return customers.find((c) => c.id === record.customerId);
}
