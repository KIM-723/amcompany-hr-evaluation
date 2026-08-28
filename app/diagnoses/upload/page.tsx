import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { DiagnosisExcelUploader } from '@/components/diagnosis/DiagnosisExcelUploader';
import { getEvaluationAccess } from '@/lib/evaluation/access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DiagnosisUploadPage() {
  const { supabase, user } = await getEvaluationAccess();

  const canUpload = user.roles.some((role) =>
    ['hr_admin', 'super_admin'].includes(role),
  );

  if (!canUpload) {
    return (
      <PageShell
        title="Excel 인사진단 업로드"
        description="구성원에게 받은 Excel을 웹 인사진단으로 자동 변환합니다."
      >
        <Card>
          <div className="py-10 text-center text-sm text-slate-500">
            HR 관리자만 Excel을 업로드할 수 있습니다.
          </div>
        </Card>
      </PageShell>
    );
  }

  const { data: periods } = await supabase
    .from('evaluation_periods')
    .select('id,name,status')
    .in('status', ['draft', 'scheduled', 'active', 'calibration'])
    .order('start_date', { ascending: false });

  return (
    <PageShell
      title="Excel → 인사진단 자동 작성"
      description="구성원에게 받은 AMCOMPANY Excel 양식을 업로드하면 해당 평가대상의 인사진단 초안으로 자동 입력합니다."
    >
      <Card>
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          <b>자동 매핑:</b> 부서·직무레벨·성명 / 성장·신뢰·전문성·감각 /
          성과·역량·태도 / 성장방향 / 기타 코멘트를 Excel에서 읽습니다.
          대상자는 <b>성명 + 부서</b> 기준으로 직원목록과 연결합니다.
        </div>

        {(periods ?? []).length === 0 ? (
          <div className="rounded-xl bg-amber-50 p-5 text-sm text-amber-800">
            먼저 평가기간을 생성하고 평가대상을 배정해주세요.
          </div>
        ) : (
          <DiagnosisExcelUploader periods={periods ?? []} />
        )}
      </Card>
    </PageShell>
  );
}
