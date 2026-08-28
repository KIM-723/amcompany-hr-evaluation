import 'server-only';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUserContext } from '@/lib/auth/user-context';

export async function getEvaluationAccess() {
  const user = await getCurrentUserContext();
  if (!user) redirect('/login');

  if (process.env.FORCE_DEMO_LOGIN === 'true') {
    const supabase = createAdminClient();
    if (!supabase) {
      throw new Error(
        'FORCE_DEMO_LOGIN에서는 SUPABASE_SECRET_KEY 또는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.',
      );
    }
    return { user, supabase, forced: true };
  }

  const supabase = await createClient();
  if (!supabase) throw new Error('Supabase 환경변수가 없습니다.');
  return { user, supabase, forced: false };
}

export async function resolveActorEmployeeId(
  supabase: any,
  user: { employeeId: string | null; employeeNo: string | null },
) {
  if (user.employeeId) return user.employeeId;

  if (user.employeeNo) {
    const { data } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_no', user.employeeNo)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  const { data } = await supabase
    .from('employees')
    .select('id')
    .eq('employment_status', 'active')
    .order('employee_no')
    .limit(1)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}

export function redirectMessage(
  path: string,
  kind: 'success' | 'error',
  message: string,
) {
  const joiner = path.includes('?') ? '&' : '?';
  redirect(`${path}${joiner}${kind}=${encodeURIComponent(message)}`);
}
