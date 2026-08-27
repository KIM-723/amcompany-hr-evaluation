import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function loadEmployeeFormOptions(supabase: SupabaseClient) {
  const [{ data: departments }, { data: jobLevels }, { data: positions }, { data: leaders }] = await Promise.all([
    supabase.from('departments').select('id,name').eq('is_active', true).order('sort_order').order('name'),
    supabase.from('job_levels').select('id,name').eq('is_active', true).order('level_order'),
    supabase.from('positions').select('id,name').eq('is_active', true).order('sort_order').order('name'),
    supabase.from('employees').select('id,employee_no,name').eq('employment_status', 'active').eq('is_leader', true).order('employee_no'),
  ]);
  return {
    departments: (departments ?? []) as { id: string; name: string }[],
    jobLevels: (jobLevels ?? []) as { id: string; name: string }[],
    positions: (positions ?? []) as { id: string; name: string }[],
    leaders: (leaders ?? []) as { id: string; employee_no: string; name: string }[],
  };
}
