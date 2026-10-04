const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5080/api';
let sessionToken = localStorage.getItem('garagehub-token');

export function setApiToken(token: string | null) {
  sessionToken = token;
}

export interface AuthUser {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
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

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  ownerCount: number;
  activeUserCount: number;
  archived: boolean;
  logoUrl: string | null;
}

export interface OrganizationIdentity {
  id: string;
  name: string;
  logoUrl: string | null;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (sessionToken) headers.set('Authorization', `Bearer ${sessionToken}`);
  const response = await fetch(`${API_URL}${path}`, { cache: 'no-store', ...init, headers });
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

export interface CreateUserInput {
  name: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  organizationId?: string;
}

export type UpdateUserInput = Omit<CreateUserInput, 'password'>;

export const usersApi = {
  list: () => api<AuthUser[]>('/users'),
  create: (input: CreateUserInput) => api<AuthUser>('/users', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: UpdateUserInput) => api<AuthUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  setActive: (id: string, active: boolean) => api<AuthUser>(`/users/${id}/active`, { method: 'PUT', body: JSON.stringify({ active }) }),
  setPassword: (id: string, password: string) => api<void>(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
};

export const organizationsApi = {
  current: () => api<OrganizationIdentity>('/organization'),
  list: () => api<OrganizationSummary[]>('/admin/organizations'),
  switch: (id: string) => api<LoginResult>(`/admin/organizations/${id}/switch`, { method: 'POST' }),
  create: (name: string) =>
    api<OrganizationSummary>('/admin/organizations', { method: 'POST', body: JSON.stringify({ name }) }),
  update: (id: string, name: string) =>
    api<OrganizationSummary>(`/admin/organizations/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  setArchived: (id: string, archived: boolean) =>
    api<OrganizationSummary>(`/admin/organizations/${id}/archived`, { method: 'PUT', body: JSON.stringify({ archived }) }),
  uploadLogo: (id: string, file: File) => {
    const form = new FormData();
    form.set('file', file);
    return api<OrganizationSummary>(`/admin/organizations/${id}/logo`, { method: 'POST', body: form });
  },
  removeLogo: (id: string) => api<void>(`/admin/organizations/${id}/logo`, { method: 'DELETE' }),
};

interface UploadedDocument {
  id: string;
}

export const documentsApi = {
  async uploadImage(file: File, type: string): Promise<string> {
    const form = new FormData();
    form.set('file', file);
    form.set('type', type);
    const document = await api<UploadedDocument>('/documents', { method: 'POST', body: form });
    return `document:${document.id}`;
  },
  async resolveUrl(reference: string): Promise<string> {
    if (!reference.startsWith('document:')) return reference;
    const id = reference.slice('document:'.length);
    const result = await api<{ url: string }>(`/documents/${id}/download`);
    return result.url.startsWith('/') ? `${new URL(API_URL).origin}${result.url}` : result.url;
  },
};

function stateApi(basePath: string) {
  return {
  async get<T>(): Promise<WorkflowEnvelope<T> | null> {
    const response = await fetch(`${API_URL}/${basePath}`, {
      cache: 'no-store',
      headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(await response.text());
    return response.json() as Promise<WorkflowEnvelope<T>>;
  },
  async save<T>(baseVersion: number, data: T): Promise<WorkflowSaveResult<T>> {
    const response = await fetch(`${API_URL}/${basePath}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
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
}

export const workflowApi = stateApi('workflow-state');
export const portalApi = stateApi('portal-state');
