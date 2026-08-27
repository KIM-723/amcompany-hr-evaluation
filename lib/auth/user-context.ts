import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { getPrimaryRole, normalizeRoles } from '@/lib/auth/roles';
import type { CurrentUserContext } from '@/types/auth';

type EmployeeRow = {
  id: string;
  employee_no: string;
  name: string;
  department_id: string | null;
  departments: { name: string } | { name: string }[] | null;
  job_levels: { name: string } | { name: string }[] | null;
  positions: { name: string } | { name: string }[] | null;
};

function firstName(value: { name: string } | { name: string }[] | null): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.name ?? null;
  return value.name;
}

function getForcedDemoContext(): CurrentUserContext {
  const roles = ['hr_admin', 'employee'] as const;

  return {
    userId: 'forced-demo-hr',
    email: 'hr@amcompany.demo',
    employeeId: null,
    employeeNo: 'AM032',
    name: 'HR 관리자',
    departmentId: null,
    departmentName: '경영지원',
    jobLevelName: '마스터',
    positionName: 'HR 관리자',
    roles: [...roles],
    primaryRole: 'hr_admin',
  };
}

export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  // 개발용 강제 로그인 모드.
  // Supabase Auth 세션이 없어도 HR 관리자 UI/메뉴를 사용할 수 있다.
  if (process.env.FORCE_DEMO_LOGIN === 'true') {
    return getForcedDemoContext();
  }

  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: employeeData }, { data: roleData }] = await Promise.all([
    supabase
      .from('employees')
      .select(
        'id,employee_no,name,department_id,departments(name),job_levels(name),positions(name)',
      )
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.rpc('current_role_codes'),
  ]);

  const employee = employeeData as EmployeeRow | null;
  const roles = normalizeRoles((roleData ?? []) as string[]);

  return {
    userId: user.id,
    email: user.email ?? '',
    employeeId: employee?.id ?? null,
    employeeNo: employee?.employee_no ?? null,
    name: employee?.name ?? user.email?.split('@')[0] ?? '사용자',
    departmentId: employee?.department_id ?? null,
    departmentName: firstName(employee?.departments ?? null),
    jobLevelName: firstName(employee?.job_levels ?? null),
    positionName: firstName(employee?.positions ?? null),
    roles,
    primaryRole: getPrimaryRole(roles),
  };
}
