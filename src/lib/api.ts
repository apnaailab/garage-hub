const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5080/api';

export interface AuthUser {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  photoUrl?: string;
  drivingLicensePhotoUrl?: string;
}

export interface WorkflowEnvelope<T> {
  version: number;
  data: T;
  updatedAt: string;
  updatedById: string;
}

export type WorkflowSaveResult<T> =
  | { ok: true; envelope: WorkflowEnvelope<T> }
  | { ok: false; conflict: WorkflowEnvelope<T> };

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('garagehub-token');
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401) {
    localStorage.removeItem('garagehub-token');
    localStorage.removeItem('garagehub-user');
    window.dispatchEvent(new Event('garagehub:unauthorized'));
  }
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authApi = {
  login: (email: string, password: string) =>
    api<LoginResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => api<AuthUser>('/me'),
};

export const workflowApi = {
  async get<T>(): Promise<WorkflowEnvelope<T> | null> {
    const token = localStorage.getItem('garagehub-token');
    const response = await fetch(`${API_URL}/workflow-state`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(await response.text());
    return response.json() as Promise<WorkflowEnvelope<T>>;
  },
  async save<T>(baseVersion: number, data: T): Promise<WorkflowSaveResult<T>> {
    const token = localStorage.getItem('garagehub-token');
    const response = await fetch(`${API_URL}/workflow-state`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ baseVersion, data }),
    });
    if (response.status === 409) {
      const conflict = await response.json() as WorkflowEnvelope<T>;
      return { ok: false, conflict };
    }
    if (!response.ok) throw new Error(await response.text());
    return { ok: true, envelope: await response.json() as WorkflowEnvelope<T> };
  },
};
