'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireHrAdmin } from '@/lib/hr/admin';
import { optionalText, requiredText } from '@/lib/hr/utils';

const employeeSchema = z.object({
  employee_no: z.string().min(1, '사번은 필수입니다.'),
  name: z.string().min(1, '이름은 필수입니다.'),
  email: z.string().email('이메일 형식이 올바르지 않습니다.').nullable(),
  hire_date: z.string().min(1, '입사일은 필수입니다.'),
  employment_status: z.enum(['active', 'leave', 'resigned']),
  employment_type: z.string().min(1, '고용형태는 필수입니다.'),
  department_id: z.string().uuid().nullable(),
  job_level_id: z.string().uuid().nullable(),
  position_id: z.string().uuid().nullable(),
  leader_id: z.string().uuid().nullable(),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
  is_leader: z.boolean(),
});

function parseEmployee(formData: FormData) {
  return employeeSchema.safeParse({
    employee_no: requiredText(formData.get('employee_no')),
    name: requiredText(formData.get('name')),
    email: optionalText(formData.get('email')),
    hire_date: requiredText(formData.get('hire_date')),
    employment_status: requiredText(formData.get('employment_status')),
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

export async function createEmployee(formData: FormData) {
  const parsed = parseEmployee(formData);
  if (!parsed.success) {
    redirect(messageUrl('/employees/new', 'error', parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.'));
  }

  const { supabase } = await requireHrAdmin();
  const payload = {
    ...parsed.data,
    resignation_date: parsed.data.employment_status === 'resigned' ? new Date().toISOString().slice(0, 10) : null,
  };

  const { error } = await supabase.from('employees').insert(payload);
  if (error) redirect(messageUrl('/employees/new', 'error', error.message));

  revalidatePath('/employees');
  revalidatePath('/organization');
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
      resignation_date: parsed.data.employment_status === 'resigned' ? new Date().toISOString().slice(0, 10) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', employeeId);

  if (error) redirect(messageUrl(`/employees/${employeeId}`, 'error', error.message));

  revalidatePath('/employees');
  revalidatePath(`/employees/${employeeId}`);
  redirect(messageUrl(`/employees/${employeeId}`, 'success', '직원 정보가 수정되었습니다.'));
}

export async function setEmployeeStatus(employeeId: string, status: 'active' | 'leave' | 'resigned') {
  const { supabase } = await requireHrAdmin();
  const { error } = await supabase
    .from('employees')
    .update({
      employment_status: status,
      resignation_date: status === 'resigned' ? new Date().toISOString().slice(0, 10) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', employeeId);

  if (error) redirect(messageUrl('/employees', 'error', error.message));
  revalidatePath('/employees');
  revalidatePath(`/employees/${employeeId}`);
  redirect(messageUrl('/employees', 'success', '재직상태가 변경되었습니다.'));
}
