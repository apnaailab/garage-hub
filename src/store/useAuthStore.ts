import { create } from 'zustand';
import { authApi, type AuthUser } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
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

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser(),
  loading: false,
  error: null,
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const result = await authApi.login(email, password);
      localStorage.setItem('garagehub-token', result.token);
      localStorage.setItem('garagehub-user', JSON.stringify(result.user));
      set({ user: result.user, loading: false });
    } catch {
      set({ loading: false, error: 'Invalid credentials or the API is unavailable.' });
    }
  },
  logout: () => {
    localStorage.removeItem('garagehub-token');
    localStorage.removeItem('garagehub-user');
    set({ user: null, error: null });
  },
  restore: async () => {
    if (!localStorage.getItem('garagehub-token')) return;
    try {
      const user = await authApi.me();
      localStorage.setItem('garagehub-user', JSON.stringify(user));
      set({ user });
    } catch {
      localStorage.removeItem('garagehub-token');
      localStorage.removeItem('garagehub-user');
      set({ user: null });
    }
  },
}));

window.addEventListener('garagehub:unauthorized', () => useAuthStore.getState().logout());
