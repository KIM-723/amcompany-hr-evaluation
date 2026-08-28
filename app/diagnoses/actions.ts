'use server';

import { revalidatePath } from 'next/cache';
import {
  getEvaluationAccess,
  redirectMessage,
  resolveActorEmployeeId,
} from '@/lib/evaluation/access';
import {
  firstRelation,
  isDepartmentHeadPosition,
  type DiagnosisExcelPayload,
} from '@/lib/diagnosis/utils';

export type DiagnosisImportResult = {
  ok: boolean;
  imported: number;
  errors: Array<{ file_name: string; employee_name: string; message: string }>;
  message: string;
};

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function isAdmin(roles: readonly string[]) {
  return roles.some((role) => ['hr_admin', 'super_admin'].includes(role));
}

export async function importDiagnosisExcels(
  periodId: string,
  payloadJson: string,
): Promise<DiagnosisImportResult> {
  const { supabase, user } = await getEvaluationAccess();

  if (!isAdmin(user.roles)) {
    return {
      ok: false,
      imported: 0,
      errors: [],
      message: 'Excel 인사진단 업로드는 HR 관리자만 할 수 있습니다.',
    };
  }

  let payloads: DiagnosisExcelPayload[];

  try {
    const parsed = JSON.parse(payloadJson);
    if (!Array.isArray(parsed)) throw new Error();
    payloads = parsed;
  } catch {
    return {
      ok: false,
      imported: 0,
      errors: [],
      message: 'Excel 분석 데이터를 읽을 수 없습니다.',
    };
  }

  if (!periodId) {
    return {
      ok: false,
      imported: 0,
      errors: [],
      message: '평가기간을 선택해주세요.',
    };
  }

  if (payloads.length === 0) {
    return {
      ok: false,
      imported: 0,
      errors: [],
      message: '업로드할 Excel 파일이 없습니다.',
    };
  }

  if (payloads.length > 200) {
    return {
      ok: false,
      imported: 0,
      errors: [],
      message: '한 번에 최대 200개 파일까지 업로드할 수 있습니다.',
    };
  }

  const actorId = await resolveActorEmployeeId(supabase, user);

  const [
    { data: employees, error: employeesError },
    { data: assignments, error: assignmentsError },
  ] = await Promise.all([
    supabase
      .from('employees')
      .select(
        'id,employee_no,name,department_id,job_level_id,position_id,employment_status,departments(name),job_levels(name),positions(name,evaluation_role)',
      )
      .neq('employment_status', 'resigned'),
    supabase
      .from('evaluation_assignments')
      .select(
        'id,period_id,employee_id,first_evaluator_id,second_evaluator_id',
      )
      .eq('period_id', periodId),
  ]);

  const initialError = employeesError || assignmentsError;
  if (initialError) {
    return {
      ok: false,
      imported: 0,
      errors: [],
      message: initialError.message,
    };
  }

  const assignmentMap = new Map(
    (assignments ?? []).map((assignment) => [assignment.employee_id, assignment]),
  );

  const errors: DiagnosisImportResult['errors'] = [];
  let imported = 0;

  for (const payload of payloads) {
    const sameName = (employees ?? []).filter(
      (employee) => normalize(employee.name) === normalize(payload.employee_name),
    );

    const sameDepartment = sameName.filter((employee) => {
      const department = firstRelation(employee.departments);
      return (
        !payload.department ||
        normalize(department?.name) === normalize(payload.department)
      );
    });

    const candidates = sameDepartment.length > 0 ? sameDepartment : sameName;

    if (candidates.length === 0) {
      errors.push({
        file_name: payload.file_name,
        employee_name: payload.employee_name,
        message: `직원목록에서 "${payload.employee_name}"을 찾을 수 없습니다.`,
      });
      continue;
    }

    if (candidates.length > 1) {
      errors.push({
        file_name: payload.file_name,
        employee_name: payload.employee_name,
        message: '동명이인이 있어 부서까지 정확히 일치해야 합니다.',
      });
      continue;
    }

    const employee = candidates[0];
    const assignment = assignmentMap.get(employee.id);

    if (!assignment) {
      errors.push({
        file_name: payload.file_name,
        employee_name: payload.employee_name,
        message: '선택한 평가기간의 평가대상으로 아직 배정되지 않은 직원입니다.',
      });
      continue;
    }

    const position = firstRelation(employee.positions);
    const subjectIsDepartmentHead = isDepartmentHeadPosition(position);

    // 일반 구성원:
    // first = 부서장, second = 본부장
    //
    // 부서장/기존 리더:
    // first = 본부장, second는 없어도 됨.
    const departmentHeadId = assignment.first_evaluator_id;
    const headquartersHeadId = subjectIsDepartmentHead
      ? assignment.first_evaluator_id
      : assignment.second_evaluator_id;

    if (!departmentHeadId) {
      errors.push({
        file_name: payload.file_name,
        employee_name: payload.employee_name,
        message: subjectIsDepartmentHead
          ? '본부장(1차 평가자)이 지정되어 있지 않습니다.'
          : '부서장(1차 평가자)이 지정되어 있지 않습니다.',
      });
      continue;
    }

    if (!subjectIsDepartmentHead && !headquartersHeadId) {
      errors.push({
        file_name: payload.file_name,
        employee_name: payload.employee_name,
        message: '본부장(2차 평가자)이 지정되어 있지 않습니다.',
      });
      continue;
    }

    const { error } = await supabase
      .from('personnel_diagnoses')
      .upsert(
        {
          period_id: periodId,
          assignment_id: assignment.id,
          employee_id: employee.id,
          department_head_id: departmentHeadId,
          headquarters_head_id: headquartersHeadId,
          subject_is_department_head: subjectIsDepartmentHead,
          source_file_name: payload.file_name,
          source_uploaded_by: actorId,
          source_uploaded_at: new Date().toISOString(),
          source_payload: payload,
          diagnosis_summary: payload.diagnosis_summary,
          growth_points: payload.growth_points,
          growth_directions: payload.growth_directions,
          other_comment: payload.other_comment || null,
          status: 'imported',
          updated_by: actorId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'assignment_id' },
      );

    if (error) {
      errors.push({
        file_name: payload.file_name,
        employee_name: payload.employee_name,
        message: error.message,
      });
      continue;
    }

    imported += 1;
  }

  revalidatePath('/diagnoses');
  revalidatePath('/diagnoses/upload');
  revalidatePath('/diagnoses/results');
  revalidatePath('/dashboard');

  return {
    ok: errors.length === 0,
    imported,
    errors,
    message:
      errors.length === 0
        ? `${imported}명의 Excel 내용을 인사진단으로 자동 작성했습니다.`
        : `${imported}명 등록 · ${errors.length}건 확인 필요`,
  };
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function buildDiagnosisSummary(formData: FormData) {
  return ['성장', '신뢰', '전문성', '감각'].map((category, index) => ({
    category,
    content: readText(formData, `summary_${index}_content`),
    evidence: readText(formData, `summary_${index}_evidence`),
  }));
}

function buildGrowthPoints(formData: FormData) {
  return ['성과', '역량', '태도'].map((category, index) => ({
    category,
    detail: readText(formData, `growth_${index}_detail`),
    reason: readText(formData, `growth_${index}_reason`),
  }));
}

function buildGrowthDirections(formData: FormData) {
  return [0, 1, 2]
    .map((index) => ({
      area: readText(formData, `direction_${index}_area`),
      action: readText(formData, `direction_${index}_action`),
    }))
    .filter((item) => item.area || item.action);
}

async function getDiagnosisAndActor(diagnosisId: string) {
  const { supabase, user } = await getEvaluationAccess();
  const actorId = await resolveActorEmployeeId(supabase, user);

  const { data: diagnosis, error } = await supabase
    .from('personnel_diagnoses')
    .select('*')
    .eq('id', diagnosisId)
    .single();

  if (error || !diagnosis) {
    redirectMessage('/diagnoses', 'error', error?.message ?? '진단을 찾을 수 없습니다.');
  }

  return { supabase, user, actorId, diagnosis };
}

export async function saveDepartmentHeadDiagnosis(
  diagnosisId: string,
  formData: FormData,
) {
  const { supabase, user, actorId, diagnosis } =
    await getDiagnosisAndActor(diagnosisId);

  const admin = isAdmin(user.roles);
  const canEdit =
    admin ||
    (actorId && actorId === diagnosis.department_head_id);

  if (!canEdit) {
    redirectMessage(
      `/diagnoses/${diagnosisId}`,
      'error',
      diagnosis.subject_is_department_head
        ? '이 진단을 작성할 본부장 권한이 없습니다.'
        : '이 진단을 작성할 부서장 권한이 없습니다.',
    );
  }

  const payload = {
    diagnosis_summary: buildDiagnosisSummary(formData),
    growth_points: buildGrowthPoints(formData),
    other_comment: readText(formData, 'other_comment') || null,
    status: 'department_head_in_progress',
    updated_by: actorId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('personnel_diagnoses')
    .update(payload)
    .eq('id', diagnosisId);

  if (error) {
    redirectMessage(`/diagnoses/${diagnosisId}`, 'error', error.message);
  }

  revalidatePath('/diagnoses');
  revalidatePath(`/diagnoses/${diagnosisId}`);

  redirectMessage(
    `/diagnoses/${diagnosisId}`,
    'success',
    diagnosis.subject_is_department_head
      ? '본부장 진단 요약과 성장 포인트를 저장했습니다.'
      : '부서장 진단 요약과 성장 포인트를 저장했습니다.',
  );
}

export async function completeDepartmentHeadDiagnosis(
  diagnosisId: string,
  formData: FormData,
) {
  const { supabase, user, actorId, diagnosis } =
    await getDiagnosisAndActor(diagnosisId);

  const admin = isAdmin(user.roles);
  const canEdit =
    admin ||
    (actorId && actorId === diagnosis.department_head_id);

  if (!canEdit) {
    redirectMessage(`/diagnoses/${diagnosisId}`, 'error', '진단 완료 권한이 없습니다.');
  }

  const summary = buildDiagnosisSummary(formData);
  const growthPoints = buildGrowthPoints(formData);

  const hasSummary = summary.some((item) => item.content || item.evidence);
  const hasGrowthPoint = growthPoints.some((item) => item.detail || item.reason);

  if (!hasSummary) {
    redirectMessage(`/diagnoses/${diagnosisId}`, 'error', '진단 요약을 작성해주세요.');
  }

  if (!hasGrowthPoint) {
    redirectMessage(`/diagnoses/${diagnosisId}`, 'error', '성장 포인트를 작성해주세요.');
  }

  const nextStatus = diagnosis.subject_is_department_head
    ? 'department_head_completed'
    : 'department_head_completed';

  const { error } = await supabase
    .from('personnel_diagnoses')
    .update({
      diagnosis_summary: summary,
      growth_points: growthPoints,
      other_comment: readText(formData, 'other_comment') || null,
      department_head_completed_at: new Date().toISOString(),
      status: nextStatus,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', diagnosisId);

  if (error) {
    redirectMessage(`/diagnoses/${diagnosisId}`, 'error', error.message);
  }

  revalidatePath('/diagnoses');
  revalidatePath(`/diagnoses/${diagnosisId}`);

  redirectMessage(
    `/diagnoses/${diagnosisId}`,
    'success',
    diagnosis.subject_is_department_head
      ? '본부장 진단 요약·성장 포인트를 확정했습니다. 이어서 성장 방향을 작성해주세요.'
      : '부서장 진단을 확정했습니다. 본부장 성장 방향 제안 단계로 넘겼습니다.',
  );
}

export async function saveHeadquartersDirection(
  diagnosisId: string,
  formData: FormData,
) {
  const { supabase, user, actorId, diagnosis } =
    await getDiagnosisAndActor(diagnosisId);

  const admin = isAdmin(user.roles);
  const canEdit =
    admin ||
    (actorId && actorId === diagnosis.headquarters_head_id) ||
    (
      diagnosis.subject_is_department_head &&
      actorId &&
      actorId === diagnosis.department_head_id
    );

  if (!canEdit) {
    redirectMessage(`/diagnoses/${diagnosisId}`, 'error', '본부장 작성 권한이 없습니다.');
  }

  const { error } = await supabase
    .from('personnel_diagnoses')
    .update({
      growth_directions: buildGrowthDirections(formData),
      other_comment: readText(formData, 'other_comment') || diagnosis.other_comment,
      status: 'headquarters_head_in_progress',
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', diagnosisId);

  if (error) {
    redirectMessage(`/diagnoses/${diagnosisId}`, 'error', error.message);
  }

  revalidatePath('/diagnoses');
  revalidatePath(`/diagnoses/${diagnosisId}`);

  redirectMessage(`/diagnoses/${diagnosisId}`, 'success', '성장 방향을 저장했습니다.');
}

export async function completeDiagnosis(
  diagnosisId: string,
  formData: FormData,
) {
  const { supabase, user, actorId, diagnosis } =
    await getDiagnosisAndActor(diagnosisId);

  const admin = isAdmin(user.roles);
  const canEdit =
    admin ||
    (actorId && actorId === diagnosis.headquarters_head_id) ||
    (
      diagnosis.subject_is_department_head &&
      actorId &&
      actorId === diagnosis.department_head_id
    );

  if (!canEdit) {
    redirectMessage(`/diagnoses/${diagnosisId}`, 'error', '최종 진단 완료 권한이 없습니다.');
  }

  const directions = buildGrowthDirections(formData);

  if (!directions.some((item) => item.area || item.action)) {
    redirectMessage(`/diagnoses/${diagnosisId}`, 'error', '성장 방향을 1개 이상 작성해주세요.');
  }

  const { error } = await supabase
    .from('personnel_diagnoses')
    .update({
      growth_directions: directions,
      other_comment: readText(formData, 'other_comment') || diagnosis.other_comment,
      headquarters_head_completed_at: new Date().toISOString(),
      status: 'completed',
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', diagnosisId);

  if (error) {
    redirectMessage(`/diagnoses/${diagnosisId}`, 'error', error.message);
  }

  revalidatePath('/diagnoses');
  revalidatePath('/diagnoses/results');
  revalidatePath(`/diagnoses/${diagnosisId}`);

  redirectMessage(`/diagnoses/${diagnosisId}`, 'success', '인사진단을 최종 완료했습니다.');
}
