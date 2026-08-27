import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { EmployeeForm } from '@/components/hr/EmployeeForm';
import { Notice } from '@/components/hr/Notice';
import { createEmployee } from '@/app/employees/actions';
import { requireHrAdmin } from '@/lib/hr/admin';
import { loadEmployeeFormOptions } from '@/lib/hr/form-options';
import { stringParam } from '@/lib/hr/utils';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewEmployeePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase } = await requireHrAdmin();
  const options = await loadEmployeeFormOptions(supabase);
  return (
    <PageShell title="직원 신규 등록" description="사번과 인사 기본정보를 등록합니다. 로그인 계정 연결은 STEP 4 Auth 관리와 별도로 운영할 수 있습니다.">
      <Notice error={stringParam(params.error)} />
      <Card><EmployeeForm action={createEmployee} {...options} submitLabel="직원 등록" /></Card>
    </PageShell>
  );
}
