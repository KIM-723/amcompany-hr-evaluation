'use client';

import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    const supabase = createClient();
    if (!supabase || loading) return;
    setLoading(true);
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
    >
      <LogOut size={14} />
      {loading ? '로그아웃 중' : '로그아웃'}
    </button>
  );
}
