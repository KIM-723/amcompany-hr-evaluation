import 'server-only';

import { redirect } from 'next/navigation';
import { getCurrentUserContext } from '@/lib/auth/user-context';
import { createClient } from '@/lib/supabase/server';

export async function requireHrAdmin() {
  const user = await getCurrentUserContext();
  if (!user) redirect('/login');
  if (!user!.roles.includes('hr_admin') && !user!.roles.includes('super_admin')) {
    redirect('/forbidden');
  }

  const supabase = await createClient();
  if (!supabase) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');

  return { user: user!, supabase };
}
