import 'server-only';

import { redirect } from 'next/navigation';
import { getCurrentUserContext } from '@/lib/auth/user-context';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function requireHrAdmin() {
  const user = await getCurrentUserContext();

  if (!user) {
    redirect('/login');
  }

  if (!user.roles.includes('hr_admin') && !user.roles.includes('super_admin')) {
    redirect('/forbidden');
  }

  // 개발 중 FORCE_DEMO_LOGIN=true인 경우 실제 Auth session이 없으므로
  // anon client를 사용하면 RLS에 막힐 수 있다.
  // 이때만 서버 전용 Secret/Service Role client를 사용한다.
  if (process.env.FORCE_DEMO_LOGIN === 'true') {
    const admin = createAdminClient();

    if (!admin) {
      throw new Error(
        '강제 로그인 모드에서 DB를 수정하려면 Vercel에 SUPABASE_SECRET_KEY 또는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.',
      );
    }

    return {
      user,
      supabase: admin,
      isForcedDemo: true,
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  }

  return {
    user,
    supabase,
    isForcedDemo: false,
  };
}
