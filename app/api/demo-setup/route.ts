import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const PASSWORD = 'Amcompany!2026';

const DEMO_ACCOUNTS = [
  { label: '직원', email: 'employee@amcompany.demo', employeeNo: 'AM001', role: 'employee', scoped: false },
  { label: '1차 평가자', email: 'first@amcompany.demo', employeeNo: 'AM004', role: 'first_evaluator', scoped: true },
  { label: '2차 평가자', email: 'second@amcompany.demo', employeeNo: 'AM033', role: 'second_evaluator', scoped: false },
  { label: '리더', email: 'leader@amcompany.demo', employeeNo: 'AM008', role: 'leader', scoped: true },
  { label: 'HR 관리자', email: 'hr@amcompany.demo', employeeNo: 'AM032', role: 'hr_admin', scoped: false },
  { label: '최고관리자', email: 'admin@amcompany.demo', employeeNo: 'AM038', role: 'super_admin', scoped: false },
] as const;

async function findAuthUser(admin: NonNullable<ReturnType<typeof createAdminClient>>, email: string) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function ensureRole(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  employeeId: string,
  departmentId: string | null,
  roleCode: string,
  scoped: boolean,
) {
  const { data: role, error: roleError } = await admin
    .from('roles')
    .select('id')
    .eq('code', roleCode)
    .single();
  if (roleError) throw roleError;

  let query = admin
    .from('employee_role_assignments')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('role_id', role.id)
    .is('valid_to', null);

  if (scoped && departmentId) query = query.eq('scope_department_id', departmentId);

  const { data: existing, error: existingError } = await query.maybeSingle();
  if (existingError) throw existingError;
  if (existing) return;

  const { error: insertError } = await admin.from('employee_role_assignments').insert({
    employee_id: employeeId,
    role_id: role.id,
    scope_department_id: scoped ? departmentId : null,
    valid_from: '2026-01-01',
  });
  if (insertError) throw insertError;
}

export async function POST(request: Request) {
  if (process.env.DEMO_SETUP_ENABLED !== 'true') {
    return NextResponse.json({ ok: false, message: 'Demo Setup이 비활성화되어 있습니다.' }, { status: 404 });
  }

  const expectedSecret = process.env.DEMO_SETUP_SECRET;
  const body = (await request.json().catch(() => ({}))) as { secret?: string; action?: string };

  if (!expectedSecret || body.secret !== expectedSecret) {
    return NextResponse.json({ ok: false, message: 'Setup Secret이 올바르지 않습니다.' }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, message: 'Supabase Service Role 환경변수를 확인해주세요.' }, { status: 500 });
  }

  try {
    if (body.action === 'delete') {
      for (const account of DEMO_ACCOUNTS) {
        const user = await findAuthUser(admin, account.email);
        if (!user) continue;
        await admin.from('employees').update({ user_id: null }).eq('user_id', user.id);
        const { error } = await admin.auth.admin.deleteUser(user.id);
        if (error) throw error;
      }
      return NextResponse.json({ ok: true, message: 'Demo Auth 계정을 삭제했습니다.' });
    }

    for (const account of DEMO_ACCOUNTS) {
      let user = await findAuthUser(admin, account.email);

      if (!user) {
        const { data, error } = await admin.auth.admin.createUser({
          email: account.email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { demo: true, demo_label: account.label },
        });
        if (error) throw error;
        user = data.user;
      } else {
        const { data, error } = await admin.auth.admin.updateUserById(user.id, {
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { ...user.user_metadata, demo: true, demo_label: account.label },
        });
        if (error) throw error;
        user = data.user;
      }

      const { data: employee, error: employeeError } = await admin
        .from('employees')
        .select('id,name,department_id,user_id')
        .eq('employee_no', account.employeeNo)
        .single();
      if (employeeError) throw employeeError;

      if (employee.user_id && employee.user_id !== user.id) {
        await admin.from('employees').update({ user_id: null }).eq('id', employee.id);
      }

      const { error: profileError } = await admin.from('profiles').upsert({
        id: user.id,
        display_name: employee.name,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw profileError;

      const { error: linkError } = await admin
        .from('employees')
        .update({ user_id: user.id, updated_at: new Date().toISOString() })
        .eq('id', employee.id);
      if (linkError) throw linkError;

      await ensureRole(admin, employee.id, employee.department_id, account.role, account.scoped);
    }

    return NextResponse.json({
      ok: true,
      message: `Demo 계정 ${DEMO_ACCOUNTS.length}개를 생성/재설정했습니다. 공통 비밀번호: ${PASSWORD}`,
      accounts: DEMO_ACCOUNTS.map(({ label, email, employeeNo }) => ({ label, email, employeeNo })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ ok: false, message: `Demo 계정 처리 실패: ${message}` }, { status: 500 });
  }
}
