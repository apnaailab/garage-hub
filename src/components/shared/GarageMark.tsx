import { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GarageMark({ logoUrl, loading = false, size = 'md' }: { logoUrl?: string | null; loading?: boolean; size?: 'sm' | 'md' }) {
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => setLogoFailed(false), [logoUrl]);

  const frameClass = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-xl';
  const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  if (loading) return <span className={cn('shrink-0 animate-pulse bg-ink-200 dark:bg-ink-700', frameClass)} aria-label="Loading garage logo" />;
  if (logoUrl && !logoFailed) {
    return <img src={logoUrl} alt="" className={cn('shrink-0 border border-ink-100 object-cover dark:border-ink-700', frameClass)} onError={() => setLogoFailed(true)} />;
  }
  return <span className={cn('flex shrink-0 items-center justify-center bg-brand-600 text-white shadow-lg shadow-brand-600/30', frameClass)}><Wrench className={iconClass} /></span>;
}