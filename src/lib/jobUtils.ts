import type { JobCard } from '@/types';
import { serviceById } from '@/lib/workflows';

export function servicesTotal(job: JobCard): number {
  return job.serviceIds.reduce((sum, id) => sum + (serviceById(id)?.price ?? 0), 0);
}

export function approvedPartsTotal(job: JobCard): number {
  return job.parts
    .filter((p) => p.approved === true)
    .reduce((sum, p) => sum + p.price * p.quantity, 0);
}

export function pendingPartsTotal(job: JobCard): number {
  return job.parts
    .filter((p) => p.approved === null)
    .reduce((sum, p) => sum + p.price * p.quantity, 0);
}

export function jobTotal(job: JobCard): number {
  return servicesTotal(job) + approvedPartsTotal(job);
}

export function estimatedHours(job: JobCard): number {
  return job.serviceIds.reduce((sum, id) => sum + (serviceById(id)?.estimatedHours ?? 0), 0);
}
