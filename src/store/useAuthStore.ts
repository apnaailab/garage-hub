import { create } from 'zustand';
import { authApi, organizationsApi, setApiToken, type AuthUser, type LoginResult, type OrganizationSummary } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  garageName: string | null;
  organizations: OrganizationSummary[];
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loadGarageName: () => Promise<void>;
  loadOrganizations: () => Promise<void>;
  switchOrganization: (id: string) => Promise<void>;
  acceptSession: (result: LoginResult) => void;
  logout: () => void;
  restore: () => Promise<void>;
}

function storedUser(): AuthUser | null {
  try {
    const value = localStorage.getItem('garagehub-user');
    return value ? (JSON.parse(value) as AuthUser) : null;
  } catch {
    return null;
  }
}

function persistSession(token: string, user: AuthUser) {
  window.dispatchEvent(new Event('garagehub:session-changing'));
  setApiToken(token);
  localStorage.setItem('garagehub-token', token);
  localStorage.setItem('garagehub-user', JSON.stringify(user));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: storedUser(),
  garageName: null,
  organizations: [],
  loading: false,
  error: null,
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const result = await authApi.login(email, password);
      persistSession(result.token, result.user);
      set({ user: result.user, loading: false });
      void get().loadGarageName().catch(() => undefined);
      if (result.user.role === 'admin') void get().loadOrganizations().catch(() => undefined);
    } catch {
      set({ loading: false, error: 'Invalid credentials or the API is unavailable.' });
    }
  },
  loadGarageName: async () => {
    const organizationId = get().user?.organizationId;
    if (!organizationId) return;
    const organization = await organizationsApi.current();
    if (get().user?.organizationId === organizationId) set({ garageName: organization.name });
  },
  loadOrganizations: async () => {
    if (get().user?.role !== 'admin') return;
    const organizations = await organizationsApi.list();
    set({ organizations });
  },
  switchOrganization: async (id) => {
    if (id === get().user?.organizationId) return;
    set({ loading: true, error: null });
    try {
      const result = await organizationsApi.switch(id);
      get().acceptSession(result);
    } catch {
      set({ loading: false, error: 'Unable to switch garages.' });
      throw new Error('Unable to switch garages.');
    }
  },
  acceptSession: (result) => {
    persistSession(result.token, result.user);
    set({ user: result.user, garageName: null, loading: false, error: null });
    void get().loadGarageName().catch(() => undefined);
  },
  logout: () => {
    window.dispatchEvent(new Event('garagehub:session-changing'));
    setApiToken(null);
    localStorage.removeItem('garagehub-token');
    localStorage.removeItem('garagehub-user');
    set({ user: null, garageName: null, organizations: [], error: null });
  },
  restore: async () => {
    if (!localStorage.getItem('garagehub-token')) return;
    try {
      const user = await authApi.me();
      localStorage.setItem('garagehub-user', JSON.stringify(user));
      set({ user });
      void get().loadGarageName().catch(() => undefined);
      if (user.role === 'admin') void get().loadOrganizations().catch(() => undefined);
    } catch {
      localStorage.removeItem('garagehub-token');
      localStorage.removeItem('garagehub-user');
      set({ user: null, garageName: null });
    }
  },
}));

window.addEventListener('garagehub:unauthorized', () => useAuthStore.getState().logout());
window.addEventListener('storage', (event) => {
  if (event.key === 'garagehub-token' && event.oldValue !== event.newValue) window.location.reload();
});
