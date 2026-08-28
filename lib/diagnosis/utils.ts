export type DiagnosisSummaryItem = {
  category: '성장' | '신뢰' | '전문성' | '감각';
  content: string;
  evidence: string;
};

export type GrowthPointItem = {
  category: '성과' | '역량' | '태도';
  detail: string;
  reason: string;
};

export type GrowthDirectionItem = {
  area: string;
  action: string;
};

export type DiagnosisExcelPayload = {
  file_name: string;
  department: string;
  job_level: string;
  employee_name: string;
  diagnosis_summary: DiagnosisSummaryItem[];
  growth_points: GrowthPointItem[];
  growth_directions: GrowthDirectionItem[];
  other_comment: string;
};

export function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function isDepartmentHeadPosition(
  position:
    | { name?: string | null; evaluation_role?: string | null }
    | null
    | undefined,
) {
  const name = (position?.name ?? '').trim();

  return (
    position?.evaluation_role === 'leader' ||
    name.includes('부서장') ||
    name.includes('리더')
  );
}

export function diagnosisStatusLabel(
  status: string,
  subjectIsDepartmentHead: boolean,
) {
  const labels: Record<string, string> = {
    imported: 'Excel 업로드 완료',
    department_head_in_progress: subjectIsDepartmentHead
      ? '본부장 진단 작성중'
      : '부서장 진단 작성중',
    department_head_completed: subjectIsDepartmentHead
      ? '본부장 성장방향 작성중'
      : '본부장 성장방향 대기',
    headquarters_head_in_progress: '본부장 성장방향 작성중',
    completed: '진단 완료',
  };

  return labels[status] ?? status;
}
