import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { EmployeeExcelImport } from '@/components/hr/EmployeeExcelImport';
import { requireHrAdmin } from '@/lib/hr/admin';

export default async function EmployeeImportPage() {
  await requireHrAdmin();

  return (
    <PageShell
      title="직원 Excel 일괄등록"
      description="신규 직원정보를 Excel로 업로드하여 한 번에 등록합니다."
    >
      <Card>
        <EmployeeExcelImport />
      </Card>
    </PageShell>
  );
}
