'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireHrAdmin } from '@/lib/hr/admin';
import { integerValue, optionalText, requiredText } from '@/lib/hr/utils';

function go(path: string, kind: 'success' | 'error', message: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(message)}`);
}

export async function createDepartment(formData: FormData) {
  const name = requiredText(formData.get('name'));
  if (!name) go('/organization', 'error', '부서명은 필수입니다.');

  const { supabase } = await requireHrAdmin();
  const { error } = await supabase.from('departments').insert({
    name,
    code: optionalText(formData.get('code')),
    parent_id: optionalText(formData.get('parent_id')),
    description: optionalText(formData.get('description')),
    sort_order: integerValue(formData.get('sort_order')),
    is_active: true,
  });
  if (error) go('/organization', 'error', error.message);
  revalidatePath('/organization');
  go('/organization', 'success', '부서가 등록되었습니다.');
}

export async function updateDepartment(id: string, formData: FormData) {
  const name = requiredText(formData.get('name'));
  const parentId = optionalText(formData.get('parent_id'));
  if (!name) go(`/organization/departments/${id}`, 'error', '부서명은 필수입니다.');
  if (parentId === id) go(`/organization/departments/${id}`, 'error', '자기 자신을 상위부서로 지정할 수 없습니다.');

  const { supabase } = await requireHrAdmin();
  const { error } = await supabase.from('departments').update({
    name,
    code: optionalText(formData.get('code')),
    parent_id: parentId,
    description: optionalText(formData.get('description')),
    sort_order: integerValue(formData.get('sort_order')),
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) go(`/organization/departments/${id}`, 'error', error.message);
  revalidatePath('/organization');
  go(`/organization/departments/${id}`, 'success', '부서 정보가 수정되었습니다.');
}

export async function setDepartmentActive(id: string, active: boolean) {
  const { supabase } = await requireHrAdmin();
  const { error } = await supabase.from('departments').update({ is_active: active, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) go('/organization', 'error', error.message);
  revalidatePath('/organization');
  go('/organization', 'success', active ? '부서가 활성화되었습니다.' : '부서가 비활성화되었습니다.');
}

export async function createJobLevel(formData: FormData) {
  const name = requiredText(formData.get('name'));
  if (!name) go('/organization/job-levels', 'error', '직급명은 필수입니다.');
  const { supabase } = await requireHrAdmin();
  const { error } = await supabase.from('job_levels').insert({
    name,
    code: optionalText(formData.get('code')),
    level_order: integerValue(formData.get('level_order'), 1),
    description: optionalText(formData.get('description')),
    is_active: true,
  });
  if (error) go('/organization/job-levels', 'error', error.message);
  revalidatePath('/organization/job-levels');
  go('/organization/job-levels', 'success', '직급이 등록되었습니다.');
}

export async function updateJobLevel(id: string, formData: FormData) {
  const name = requiredText(formData.get('name'));
  if (!name) go(`/organization/job-levels/${id}`, 'error', '직급명은 필수입니다.');
  const { supabase } = await requireHrAdmin();
  const { error } = await supabase.from('job_levels').update({
    name,
    code: optionalText(formData.get('code')),
    level_order: integerValue(formData.get('level_order'), 1),
    description: optionalText(formData.get('description')),
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) go(`/organization/job-levels/${id}`, 'error', error.message);
  revalidatePath('/organization/job-levels');
  go(`/organization/job-levels/${id}`, 'success', '직급이 수정되었습니다.');
}

export async function setJobLevelActive(id: string, active: boolean) {
  const { supabase } = await requireHrAdmin();
  const { error } = await supabase.from('job_levels').update({ is_active: active, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) go('/organization/job-levels', 'error', error.message);
  revalidatePath('/organization/job-levels');
  go('/organization/job-levels', 'success', active ? '직급이 활성화되었습니다.' : '직급이 비활성화되었습니다.');
}

export async function createPosition(formData: FormData) {
  const name = requiredText(formData.get('name'));
  if (!name) go('/organization/positions', 'error', '직책명은 필수입니다.');
  const { supabase } = await requireHrAdmin();
  const evaluationRole = requiredText(formData.get('evaluation_role')) || 'none';
  if (!['none','leader','division_head','executive'].includes(evaluationRole)) {
    go('/organization/positions', 'error', '평가자 구분값이 올바르지 않습니다.');
  }

  const { error } = await supabase.from('positions').insert({
    name,
    code: optionalText(formData.get('code')),
    sort_order: integerValue(formData.get('sort_order')),
    description: optionalText(formData.get('description')),
    evaluation_role: evaluationRole,
    is_active: true,
  });
  if (error) go('/organization/positions', 'error', error.message);
  revalidatePath('/organization/positions');
  go('/organization/positions', 'success', '직책이 등록되었습니다.');
}

export async function updatePosition(id: string, formData: FormData) {
  const name = requiredText(formData.get('name'));
  if (!name) go(`/organization/positions/${id}`, 'error', '직책명은 필수입니다.');
  const { supabase } = await requireHrAdmin();
  const evaluationRole = requiredText(formData.get('evaluation_role')) || 'none';
  if (!['none','leader','division_head','executive'].includes(evaluationRole)) {
    go(`/organization/positions/${id}`, 'error', '평가자 구분값이 올바르지 않습니다.');
  }

  const { error } = await supabase.from('positions').update({
    name,
    code: optionalText(formData.get('code')),
    sort_order: integerValue(formData.get('sort_order')),
    description: optionalText(formData.get('description')),
    evaluation_role: evaluationRole,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) go(`/organization/positions/${id}`, 'error', error.message);
  revalidatePath('/organization/positions');
  go(`/organization/positions/${id}`, 'success', '직책이 수정되었습니다.');
}

export async function setPositionActive(id: string, active: boolean) {
  const { supabase } = await requireHrAdmin();
  const { error } = await supabase.from('positions').update({ is_active: active, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) go('/organization/positions', 'error', error.message);
  revalidatePath('/organization/positions');
  go('/organization/positions', 'success', active ? '직책이 활성화되었습니다.' : '직책이 비활성화되었습니다.');
}
