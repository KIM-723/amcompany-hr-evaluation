'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireHrAdmin } from '@/lib/hr/admin';
import { optionalText, requiredText } from '@/lib/hr/utils';

const employeeSchema = z
  .object({
    employee_no: z.string().min(1, '사번은 필수입니다.'),
    name: z.string().min(1, '이름은 필수입니다.'),
    email: z.string().email('이메일 형식이 올바르지 않습니다.').nullable(),
    hire_date: z.string().min(1, '입사일은 필수입니다.'),
    resignation_date: z.string().nullable(),
    employment_status: z.enum(['active', 'leave', 'resigned']),
    employment_type: z.string().min(1, '고용형태는 필수입니다.'),
    department_id: z.string().uuid().nullable(),
    job_level_id: z.string().uuid().nullable(),
    position_id: z.string().uuid().nullable(),
    leader_id: z.string().uuid().nullable(),
    phone: z.string().nullable(),
    notes: z.string().nullable(),
    is_leader: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.employment_status === 'resigned' && !value.resignation_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resignation_date'],
        message: '퇴사 상태에서는 퇴사일이 필수입니다.',
      });
    }

    if (
      value.resignation_date &&
      value.hire_date &&
      value.resignation_date < value.hire_date
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resignation_date'],
        message: '퇴사일은 입사일보다 빠를 수 없습니다.',
      });
    }
  });

function parseEmployee(formData: FormData) {
  const employmentStatus = requiredText(formData.get('employment_status'));
  const rawResignationDate = optionalText(formData.get('resignation_date'));

  return employeeSchema.safeParse({
    employee_no: requiredText(formData.get('employee_no')),
    name: requiredText(formData.get('name')),
    email: optionalText(formData.get('email')),
    hire_date: requiredText(formData.get('hire_date')),
    resignation_date: employmentStatus === 'resigned' ? rawResignationDate : null,
    employment_status: employmentStatus,
    employment_type: requiredText(formData.get('employment_type')),
    department_id: optionalText(formData.get('department_id')),
    job_level_id: optionalText(formData.get('job_level_id')),
    position_id: optionalText(formData.get('position_id')),
    leader_id: optionalText(formData.get('leader_id')),
    phone: optionalText(formData.get('phone')),
    notes: optionalText(formData.get('notes')),
    is_leader: formData.get('is_leader') === 'on',
  });
}

function messageUrl(path: string, kind: 'success' | 'error', message: string) {
  return `${path}${path.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(message)}`;
}

function revalidateEmployeeAreas(employeeId?: string) {
  revalidatePath('/employees');
  if (employeeId) revalidatePath(`/employees/${employeeId}`);
  revalidatePath('/organization');
  revalidatePath('/periods', 'layout');
  revalidatePath('/dashboard');
  revalidatePath('/observations');
  revalidatePath('/evaluations/self');
  revalidatePath('/evaluations/first');
  revalidatePath('/evaluations/second');
  revalidatePath('/evaluations/results');
  revalidatePath('/calibration');
  revalidatePath('/nine-block');
  revalidatePath('/growth-plans');
  revalidatePath('/stats');
}

export async function createEmployee(formData: FormData) {
  const parsed = parseEmployee(formData);
  if (!parsed.success) {
    redirect(messageUrl('/employees/new', 'error', parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.'));
  }

  const { supabase } = await requireHrAdmin();
  const { error } = await supabase.from('employees').insert(parsed.data);

  if (error) redirect(messageUrl('/employees/new', 'error', error.message));

  revalidateEmployeeAreas();
  redirect(messageUrl('/employees', 'success', '직원이 등록되었습니다.'));
}

export async function updateEmployee(employeeId: string, formData: FormData) {
  const parsed = parseEmployee(formData);

  if (!parsed.success) {
    redirect(messageUrl(`/employees/${employeeId}`, 'error', parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.'));
  }

  if (parsed.data.leader_id === employeeId) {
    redirect(messageUrl(`/employees/${employeeId}`, 'error', '본인을 자신의 리더로 지정할 수 없습니다.'));
  }

  const { supabase } = await requireHrAdmin();

  const { error } = await supabase
    .from('employees')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', employeeId);

  if (error) redirect(messageUrl(`/employees/${employeeId}`, 'error', error.message));

  revalidateEmployeeAreas(employeeId);
  redirect(
    messageUrl(
      `/employees/${employeeId}`,
      'success',
      parsed.data.employment_status === 'resigned'
        ? `퇴사 처리되었습니다. 퇴사일 ${parsed.data.resignation_date} · 관련 평가데이터는 퇴사자로 표시됩니다.`
        : '직원 정보가 수정되었습니다.',
    ),
  );
}

export async function setEmployeeStatus(
  employeeId: string,
  status: 'active' | 'leave' | 'resigned',
  formData: FormData,
) {
  const { supabase } = await requireHrAdmin();

  const resignationDate =
    status === 'resigned'
      ? optionalText(formData.get('resignation_date'))
      : null;

  if (status === 'resigned' && !resignationDate) {
    redirect(messageUrl(`/employees/${employeeId}`, 'error', '퇴사일을 입력해주세요.'));
  }

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('hire_date')
    .eq('id', employeeId)
    .single();

  if (employeeError) {
    redirect(messageUrl(`/employees/${employeeId}`, 'error', employeeError.message));
  }

  if (resignationDate && employee?.hire_date && resignationDate < employee.hire_date) {
    redirect(messageUrl(`/employees/${employeeId}`, 'error', '퇴사일은 입사일보다 빠를 수 없습니다.'));
  }

  const { error } = await supabase
    .from('employees')
    .update({
      employment_status: status,
      resignation_date: resignationDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', employeeId);

  if (error) redirect(messageUrl(`/employees/${employeeId}`, 'error', error.message));

  revalidateEmployeeAreas(employeeId);
  redirect(
    messageUrl(
      `/employees/${employeeId}`,
      'success',
      status === 'resigned'
        ? `퇴사일 ${resignationDate}로 퇴사 처리했습니다.`
        : '재직상태가 변경되었습니다.',
    ),
  );
}

export async function deleteEmployeeCompletely(employeeId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { supabase } = await requireHrAdmin();

    const { data, error } = await supabase.rpc('delete_employee_completely', {
      p_employee_id: employeeId,
    });

    if (error) return { ok: false, message: error.message };

    revalidateEmployeeAreas();

    const name = data?.employee_name ? `${data.employee_name} (${data.employee_no ?? ''})` : '직원';
    return {
      ok: true,
      message: `${name} 영구삭제 완료 · 관련 진단/평가/관찰/성장 데이터도 함께 정리되었습니다.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : '직원 삭제 중 오류가 발생했습니다.',
    };
  }
}

export async function bulkDeleteEmployees(employeeIds: string[]): Promise<{ ok: boolean; message: string }> {
  try {
    const uniqueIds = [...new Set(employeeIds)].filter(Boolean);

    if (uniqueIds.length === 0) {
      return { ok: false, message: '삭제할 직원을 선택해주세요.' };
    }

    if (uniqueIds.length > 200) {
      return { ok: false, message: '한 번에 최대 200명까지 일괄삭제할 수 있습니다.' };
    }

    const { supabase } = await requireHrAdmin();

    const { data, error } = await supabase.rpc('delete_employees_completely', {
      p_employee_ids: uniqueIds,
    });

    if (error) return { ok: false, message: error.message };

    revalidateEmployeeAreas();

    return {
      ok: true,
      message: `${data?.deleted_count ?? uniqueIds.length}명 영구삭제 완료 · 관련 진단/평가 데이터도 함께 삭제되었습니다.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : '직원 일괄삭제 중 오류가 발생했습니다.',
    };
  }
}
