import { useState } from 'react';
import { LockKeyhole, Wrench } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';

const DEMO_ROLES = [
  ['owner', 'Owner'],
  ['manager', 'Workshop Manager'],
  ['receptionist', 'Receptionist'],
  ['driver', 'Driver'],
  ['mechanic', 'Technician'],
  ['head-mechanic', 'Head Mechanic'],
  ['accountant', 'Accountant'],
  ['washing', 'Washing Department'],
  ['wheel-alignment', 'WA/WB Specialist'],
  ['crm', 'CRM Executive'],
  ['customer', 'Customer'],
] as const;

export function Login() {
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const [role, setRole] = useState('manager');
  const [email, setEmail] = useState('manager@garagehub.local');
  const [password, setPassword] = useState('Demo@123');

  const chooseRole = (value: string) => {
    setRole(value);
    setEmail(`${value}@garagehub.local`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-50 p-4 dark:bg-ink-950">
      <section className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-7 shadow-xl dark:border-ink-800 dark:bg-ink-900">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Wrench className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold">GarageHub</h1>
            <p className="text-sm text-ink-400">Secure workshop operations</p>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void login(email, password);
          }}
        >
          <div>
            <Label>Demo actor</Label>
            <Select value={role} onChange={(event) => chooseRole(event.target.value)}>
              {DEMO_ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            <LockKeyhole className="h-4 w-4" /> {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-center text-xs text-ink-400">Local demo password: Demo@123</p>
        </form>
      </section>
    </main>
  );
}
