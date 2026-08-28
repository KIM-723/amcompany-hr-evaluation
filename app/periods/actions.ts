'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireHrAdmin } from '@/lib/hr/admin';
import { optionalText, requiredText } from '@/lib/hr/utils';

const optionalDate = z
  .string()
  .nullable()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), '날짜 형식이 올바르지 않습니다.');

const periodSchema = z
  .object({
    name: z.string().min(1, '평가기간명은 필수입니다.'),
    code: z.string().nullable(),
    description: z.string().nullable(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '시작일을 입력해주세요.'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '종료일을 입력해주세요.'),
    self_start_date: optionalDate,
    self_end_date: optionalDate,
    first_start_date: optionalDate,
    first_end_date: optionalDate,
    second_start_date: optionalDate,
    second_end_date: optionalDate,
    calibration_start_date: optionalDate,
    calibration_end_date: optionalDate,
    result_release_date: optionalDate,
  })
  .superRefine((value, ctx) => {
    const pairs: Array<[keyof typeof value, keyof typeof value, string]> = [
      ['start_date', 'end_date', '전체 평가기간'],
      ['self_start_date', 'self_end_date', '자기평가 기간'],
      ['first_start_date', 'first_end_date', '1차 평가 기간'],
      ['second_start_date', 'second_end_date', '2차 평가 기간'],
      ['calibration_start_date', 'calibration_end_date', 'Calibration 기간'],
    ];

    for (const [startKey, endKey, label] of pairs) {
      const start = value[startKey];
      const end = value[endKey];
      if (typeof start === 'string' && typeof end === 'string' && start && end && start > end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [endKey],
          message: `${label}의 종료일은 시작일보다 빠를 수 없습니다.`,
        });
      }
    }

    const phaseDates = [
      value.self_start_date,
      value.self_end_date,
      value.first_start_date,
      value.first_end_date,
      value.second_start_date,
      value.second_end_date,
      value.calibration_start_date,
      value.calibration_end_date,
    ].filter(Boolean) as string[];

    for (const date of phaseDates) {
      if (date < value.start_date || date > value.end_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '세부 평가 일정은 전체 평가기간 안에 있어야 합니다.',
        });
        break;
      }
    }
  });

function parsePeriod(formData: FormData) {
  return periodSchema.safeParse({
    name: requiredText(formData.get('name')),
    code: optionalText(formData.get('code')),
    description: optionalText(formData.get('description')),
    start_date: requiredText(formData.get('start_date')),
    end_date: requiredText(formData.get('end_date')),
    self_start_date: optionalText(formData.get('self_start_date')),
    self_end_date: optionalText(formData.get('self_end_date')),
    first_start_date: optionalText(formData.get('first_start_date')),
    first_end_date: optionalText(formData.get('first_end_date')),
    second_start_date: optionalText(formData.get('second_start_date')),
    second_end_date: optionalText(formData.get('second_end_date')),
    calibration_start_date: optionalText(formData.get('calibration_start_date')),
    calibration_end_date: optionalText(formData.get('calibration_end_date')),
    result_release_date: optionalText(formData.get('result_release_date')),
  });
}

function messageUrl(path: string, kind: 'success' | 'error', message: string) {
  return `${path}${path.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(message)}`;
}

async function getPeriodStatus(periodId: string) {
  const { supabase } = await requireHrAdmin();
  const { data, error } = await supabase
    .from('evaluation_periods')
    .select('status')
    .eq('id', periodId)
    .single();

  if (error) throw new Error(error.message);
  return data.status as string;
}

export async function createPeriod(formData: FormData) {
  const parsed = parsePeriod(formData);

  if (!parsed.success) {
    redirect(messageUrl('/periods/new', 'error', parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.'));
  }

  const { supabase, user } = await requireHrAdmin();

  const { data, error } = await supabase
    .from('evaluation_periods')
    .insert({
      ...parsed.data,
      status: 'draft',
      created_by: user.employeeId,
      updated_by: user.employeeId,
    })
    .select('id')
    .single();

  if (error) {
    redirect(messageUrl('/periods/new', 'error', error.message));
  }

  revalidatePath('/periods');
  redirect(messageUrl(`/periods/${data.id}`, 'success', '평가기간이 생성되었습니다.'));
}

export async function updatePeriod(periodId: string, formData: FormData) {
  const parsed = parsePeriod(formData);

  if (!parsed.success) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.'));
  }

  const { supabase, user } = await requireHrAdmin();

  const { data: current, error: currentError } = await supabase
    .from('evaluation_periods')
    .select('status')
    .eq('id', periodId)
    .single();

  if (currentError) {
    redirect(messageUrl('/periods', 'error', currentError.message));
  }

  if (current.status === 'closed') {
    redirect(messageUrl(`/periods/${periodId}`, 'error', '종료된 평가기간은 수정할 수 없습니다.'));
  }

  const { error } = await supabase
    .from('evaluation_periods')
    .update({
      ...parsed.data,
      updated_by: user.employeeId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', periodId);

  if (error) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', error.message));
  }

  revalidatePath('/periods');
  revalidatePath(`/periods/${periodId}`);
  redirect(messageUrl(`/periods/${periodId}`, 'success', '평가기간 정보가 수정되었습니다.'));
}

export async function clonePeriod(periodId: string) {
  const { supabase, user } = await requireHrAdmin();

  const { data: source, error: sourceError } = await supabase
    .from('evaluation_periods')
    .select('*')
    .eq('id', periodId)
    .single();

  if (sourceError) {
    redirect(messageUrl('/periods', 'error', sourceError.message));
  }

  const suffix = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const { data: cloned, error: cloneError } = await supabase
    .from('evaluation_periods')
    .insert({
      name: `${source.name} (복사본 ${suffix})`,
      code: null,
      description: source.description ?? null,
      start_date: source.start_date,
      end_date: source.end_date,
      self_start_date: source.self_start_date,
      self_end_date: source.self_end_date,
      first_start_date: source.first_start_date,
      first_end_date: source.first_end_date,
      second_start_date: source.second_start_date,
      second_end_date: source.second_end_date,
      calibration_start_date: source.calibration_start_date,
      calibration_end_date: source.calibration_end_date,
      result_release_date: source.result_release_date,
      status: 'draft',
      settings: source.settings ?? {},
      copied_from_id: source.id,
      created_by: user.employeeId,
      updated_by: user.employeeId,
    })
    .select('id')
    .single();

  if (cloneError) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', cloneError.message));
  }

  const { data: rules } = await supabase
    .from('evaluation_period_template_rules')
    .select('template_id,job_level_id,position_id,department_id,priority,is_active')
    .eq('period_id', periodId);

  if (rules && rules.length > 0) {
    const { error: ruleError } = await supabase
      .from('evaluation_period_template_rules')
      .insert(rules.map((rule) => ({ ...rule, period_id: cloned.id })));

    if (ruleError) {
      redirect(messageUrl(`/periods/${cloned.id}`, 'error', `평가기간은 복제됐지만 Template Rule 복제에 실패했습니다: ${ruleError.message}`));
    }
  }

  revalidatePath('/periods');
  redirect(messageUrl(`/periods/${cloned.id}`, 'success', '평가기간이 복제되었습니다. 평가대상자는 복제하지 않았습니다.'));
}

export async function setPeriodScheduled(periodId: string) {
  const { supabase, user } = await requireHrAdmin();
  const { error } = await supabase
    .from('evaluation_periods')
    .update({
      status: 'scheduled',
      updated_by: user.employeeId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', periodId)
    .in('status', ['draft', 'scheduled']);

  if (error) redirect(messageUrl(`/periods/${periodId}`, 'error', error.message));
  revalidatePath('/periods');
  revalidatePath(`/periods/${periodId}`);
  redirect(messageUrl(`/periods/${periodId}`, 'success', '평가기간을 예정 상태로 변경했습니다.'));
}

export async function activatePeriod(periodId: string) {
  const { supabase, user } = await requireHrAdmin();

  const { data, error } = await supabase.rpc('activate_evaluation_period', {
    p_period_id: periodId,
    p_created_by: user.employeeId,
  });

  if (error) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', error.message));
  }

  const result = Array.isArray(data) ? data[0] : data;
  const count = result?.snapshots_created ?? 0;

  revalidatePath('/periods');
  revalidatePath(`/periods/${periodId}`);
  redirect(messageUrl(`/periods/${periodId}`, 'success', `평가기간을 활성화했습니다. Snapshot ${count}건을 생성했습니다.`));
}

export async function moveToCalibration(periodId: string) {
  const { supabase, user } = await requireHrAdmin();

  const { data, error } = await supabase.rpc('start_or_restart_calibration', {
    p_period_id: periodId,
    p_actor_id: user.employeeId,
  });

  if (error) redirect(messageUrl(`/periods/${periodId}`, 'error', error.message));

  revalidatePath('/periods');
  revalidatePath(`/periods/${periodId}`);
  revalidatePath('/calibration');

  redirect(
    messageUrl(
      `/periods/${periodId}`,
      'success',
      `Calibration ${data?.calibration_round ?? ''}차를 시작했습니다.`,
    ),
  );
}

export async function releaseCalibration(periodId: string) {
  const { supabase, user } = await requireHrAdmin();

  const { data, error } = await supabase.rpc('release_calibration', {
    p_period_id: periodId,
    p_actor_id: user.employeeId,
  });

  if (error) redirect(messageUrl(`/periods/${periodId}`, 'error', error.message));

  revalidatePath('/periods');
  revalidatePath(`/periods/${periodId}`);
  revalidatePath('/calibration');

  redirect(
    messageUrl(
      `/periods/${periodId}`,
      'success',
      `Calibration ${data?.calibration_round ?? ''}차를 해제했습니다. 기존 점수 변경이력은 유지됩니다.`,
    ),
  );
}

export async function closePeriod(periodId: string) {
  const { supabase, user } = await requireHrAdmin();

  const { error } = await supabase.rpc('close_evaluation_period', {
    p_period_id: periodId,
    p_closed_by: user.employeeId,
  });

  if (error) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', error.message));
  }

  revalidatePath('/periods');
  revalidatePath(`/periods/${periodId}`);
  redirect(messageUrl(`/periods/${periodId}`, 'success', '평가기간을 종료했습니다.'));
}

export async function addEvaluationTargets(periodId: string, formData: FormData) {
  const employeeIds = formData
    .getAll('employee_ids')
    .filter((value): value is string => typeof value === 'string' && value.length > 0);

  const templateId = requiredText(formData.get('template_id'));
  const firstEvaluatorId = requiredText(formData.get('first_evaluator_id'));
  const secondEvaluatorId = requiredText(formData.get('second_evaluator_id'));
  const assignmentMode = requiredText(formData.get('assignment_mode')) || 'member';

  if (!['member', 'leader'].includes(assignmentMode)) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', '평가대상 구분값이 올바르지 않습니다.'));
  }

  if (employeeIds.length === 0) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', '평가대상자를 1명 이상 선택해주세요.'));
  }

  if (!z.string().uuid().safeParse(templateId).success) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', '평가 Template을 선택해주세요.'));
  }

  if (!z.string().uuid().safeParse(firstEvaluatorId).success) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', '1차 평가자를 선택해주세요.'));
  }

  // 일반 구성원 평가만 2차 본부장 필수.
  if (
    assignmentMode === 'member' &&
    !z.string().uuid().safeParse(secondEvaluatorId).success
  ) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', '2차 평가자인 본부장을 선택해주세요.'));
  }

  if (
    assignmentMode === 'leader' &&
    secondEvaluatorId &&
    !z.string().uuid().safeParse(secondEvaluatorId).success
  ) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', '2차 평가자 정보가 올바르지 않습니다.'));
  }

  const status = await getPeriodStatus(periodId);
  if (status === 'closed' || status === 'calibration') {
    redirect(
      messageUrl(
        `/periods/${periodId}`,
        'error',
        'Calibration 또는 종료 상태에서는 평가대상을 추가할 수 없습니다.',
      ),
    );
  }

  const { supabase } = await requireHrAdmin();

  const firstEvaluatorQuery = supabase
    .from('employees')
    .select('id,is_leader,position_id,department_id,positions(name,evaluation_role)')
    .eq('id', firstEvaluatorId)
    .neq('employment_status', 'resigned')
    .single();

  const secondEvaluatorQuery = secondEvaluatorId
    ? supabase
        .from('employees')
        .select('id,position_id,department_id,positions(name,evaluation_role)')
        .eq('id', secondEvaluatorId)
        .neq('employment_status', 'resigned')
        .single()
    : Promise.resolve({ data: null, error: null });

  const [
    { data: firstEvaluator, error: firstError },
    { data: secondEvaluator, error: secondError },
    { data: targets, error: targetError },
    { data: departments, error: departmentError },
  ] = await Promise.all([
    firstEvaluatorQuery,
    secondEvaluatorQuery,
    supabase
      .from('employees')
      .select('id,is_leader,position_id,department_id,positions(name,evaluation_role)')
      .in('id', employeeIds)
      .neq('employment_status', 'resigned'),
    supabase
      .from('departments')
      .select('id,parent_id')
      .eq('is_active', true),
  ]);

  const validationError = firstError || secondError || targetError || departmentError;
  if (validationError) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', validationError.message));
  }

  const firstPosition = Array.isArray(firstEvaluator?.positions)
    ? firstEvaluator?.positions[0]
    : firstEvaluator?.positions;

  const secondPosition = Array.isArray(secondEvaluator?.positions)
    ? secondEvaluator?.positions[0]
    : secondEvaluator?.positions;

  if (
    secondEvaluatorId &&
    (!secondEvaluator ||
      !['division_head', 'executive'].includes(
        secondPosition?.evaluation_role ?? 'none',
      ))
  ) {
    redirect(
      messageUrl(
        `/periods/${periodId}`,
        'error',
        '2차 평가자는 직책관리에서 본부장으로 지정된 직원만 선택할 수 있습니다.',
      ),
    );
  }

  if (!firstEvaluator?.department_id) {
    redirect(
      messageUrl(
        `/periods/${periodId}`,
        'error',
        '선택한 1차 평가자의 부서가 지정되어 있지 않습니다.',
      ),
    );
  }

  if (assignmentMode === 'member') {
    const firstIsDepartmentHead =
      !!firstEvaluator &&
      (
        firstPosition?.evaluation_role === 'leader' ||
        (firstPosition?.name ?? '').includes('부서장')
      );

    if (!firstIsDepartmentHead) {
      redirect(
        messageUrl(
          `/periods/${periodId}`,
          'error',
          '일반 구성원 평가의 1차 평가자는 부서장만 선택할 수 있습니다.',
        ),
      );
    }

    const invalidTarget = (targets ?? []).find((employee) => {
      const position = Array.isArray(employee.positions)
        ? employee.positions[0]
        : employee.positions;

      const positionName = position?.name ?? '';
      const isDepartmentHeadTarget =
        position?.evaluation_role === 'leader' ||
        positionName.includes('부서장') ||
        positionName.includes('리더');

      return (
        employee.id === firstEvaluatorId ||
        employee.department_id !== firstEvaluator.department_id ||
        isDepartmentHeadTarget ||
        ['division_head', 'executive'].includes(position?.evaluation_role ?? 'none')
      );
    });

    if (invalidTarget || (targets ?? []).length !== employeeIds.length) {
      redirect(
        messageUrl(
          `/periods/${periodId}`,
          'error',
          '일반 구성원 평가는 1차 평가자와 같은 부서의 일반 구성원만 등록할 수 있습니다.',
        ),
      );
    }
  } else {
    if (
      !['division_head', 'executive'].includes(
        firstPosition?.evaluation_role ?? 'none',
      )
    ) {
      redirect(
        messageUrl(
          `/periods/${periodId}`,
          'error',
          '부서장 평가의 1차 평가자는 본부장만 선택할 수 있습니다.',
        ),
      );
    }

    const descendantIds = new Set<string>();
    let frontier = [firstEvaluator.department_id];

    while (frontier.length > 0) {
      const next: string[] = [];

      for (const department of departments ?? []) {
        if (
          department.parent_id &&
          frontier.includes(department.parent_id) &&
          !descendantIds.has(department.id)
        ) {
          descendantIds.add(department.id);
          next.push(department.id);
        }
      }

      frontier = next;
    }

    const hasConfiguredSubOrganizations = descendantIds.size > 0;

    const invalidTarget = (targets ?? []).find((employee) => {
      const position = Array.isArray(employee.positions)
        ? employee.positions[0]
        : employee.positions;

      const positionName = position?.name ?? '';
      const isDepartmentHeadOrLegacyLeader =
        position?.evaluation_role === 'leader' ||
        positionName.includes('부서장') ||
        positionName.includes('리더');

      return (
        employee.id === firstEvaluatorId ||
        !employee.department_id ||
        !isDepartmentHeadOrLegacyLeader ||
        (
          hasConfiguredSubOrganizations &&
          !descendantIds.has(employee.department_id)
        )
      );
    });

    if (invalidTarget || (targets ?? []).length !== employeeIds.length) {
      redirect(
        messageUrl(
          `/periods/${periodId}`,
          'error',
          hasConfiguredSubOrganizations
            ? '부서장 평가는 선택한 본부장 산하 전체 조직의 부서장·리더만 등록할 수 있습니다.'
            : '조직 상위관계가 없는 경우 재직 중인 부서장·리더만 평가대상으로 등록할 수 있습니다.',
        ),
      );
    }
  }

  const rows = employeeIds.map((employeeId) => ({
    period_id: periodId,
    employee_id: employeeId,
    first_evaluator_id: firstEvaluatorId,
    second_evaluator_id: secondEvaluatorId || null,
    template_id: templateId,
    status: 'not_started',
    current_stage: 'not_started',
    employee_snapshot: {},
    evaluator_snapshot: {},
    template_snapshot: {},
  }));

  const { data: inserted, error } = await supabase
    .from('evaluation_assignments')
    .upsert(rows, {
      onConflict: 'period_id,employee_id',
      ignoreDuplicates: true,
    })
    .select('id');

  if (error) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', error.message));
  }

  if (status === 'active' && inserted) {
    for (const assignment of inserted) {
      const { error: snapshotError } = await supabase.rpc('create_assignment_snapshot', {
        p_assignment_id: assignment.id,
        p_created_by: null,
      });

      if (snapshotError && !snapshotError.message.includes('snapshot already exists')) {
        redirect(
          messageUrl(
            `/periods/${periodId}`,
            'error',
            `대상은 추가했지만 Snapshot 생성에 실패했습니다: ${snapshotError.message}`,
          ),
        );
      }
    }
  }

  revalidatePath(`/periods/${periodId}`);
  revalidatePath('/periods');

  redirect(
    messageUrl(
      `/periods/${periodId}`,
      'success',
      assignmentMode === 'member'
        ? `${inserted?.length ?? 0}명 등록 · 1차 부서장 / 2차 본부장으로 지정했습니다.`
        : `${inserted?.length ?? 0}명의 부서장·리더 등록 · 1차 본부장${
            secondEvaluatorId ? ' / 2차 본부장' : ' / 2차평가 없음'
          }으로 지정했습니다.`,
    ),
  );
}

export async function updateAssignment(
  periodId: string,
  assignmentId: string,
  formData: FormData,
) {
  const status = await getPeriodStatus(periodId);

  if (!['draft', 'scheduled'].includes(status)) {
    redirect(
      messageUrl(
        `/periods/${periodId}`,
        'error',
        '평가가 시작된 이후에는 평가자/Template을 직접 변경할 수 없습니다.',
      ),
    );
  }

  const firstEvaluatorId = requiredText(formData.get('first_evaluator_id'));
  const secondEvaluatorId = requiredText(formData.get('second_evaluator_id'));
  const templateId = requiredText(formData.get('template_id'));

  if (!z.string().uuid().safeParse(templateId).success) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', '평가 Template을 선택해주세요.'));
  }

  if (!z.string().uuid().safeParse(firstEvaluatorId).success) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', '1차 평가자를 선택해주세요.'));
  }

  if (
    secondEvaluatorId &&
    !z.string().uuid().safeParse(secondEvaluatorId).success
  ) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', '2차 평가자 정보가 올바르지 않습니다.'));
  }

  const { supabase } = await requireHrAdmin();

  const { data: assignment, error: assignmentError } = await supabase
    .from('evaluation_assignments')
    .select('employee_id')
    .eq('id', assignmentId)
    .eq('period_id', periodId)
    .single();

  if (assignmentError || !assignment) {
    redirect(
      messageUrl(
        `/periods/${periodId}`,
        'error',
        assignmentError?.message ?? '평가대상을 찾을 수 없습니다.',
      ),
    );
  }

  const targetQuery = supabase
    .from('employees')
    .select('id,is_leader,department_id,position_id,positions(name,evaluation_role)')
    .eq('id', assignment.employee_id)
    .single();

  const firstQuery = supabase
    .from('employees')
    .select('id,is_leader,department_id,position_id,positions(name,evaluation_role)')
    .eq('id', firstEvaluatorId)
    .single();

  const secondQuery = secondEvaluatorId
    ? supabase
        .from('employees')
        .select('id,positions(name,evaluation_role)')
        .eq('id', secondEvaluatorId)
        .single()
    : Promise.resolve({ data: null, error: null });

  const [
    { data: target, error: targetError },
    { data: firstEvaluator, error: firstError },
    { data: secondEvaluator, error: secondError },
    { data: departments, error: departmentError },
  ] = await Promise.all([
    targetQuery,
    firstQuery,
    secondQuery,
    supabase.from('departments').select('id,parent_id').eq('is_active', true),
  ]);

  const validationError = targetError || firstError || secondError || departmentError;
  if (validationError) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', validationError.message));
  }

  const targetPosition = Array.isArray(target?.positions)
    ? target?.positions[0]
    : target?.positions;
  const firstPosition = Array.isArray(firstEvaluator?.positions)
    ? firstEvaluator?.positions[0]
    : firstEvaluator?.positions;
  const secondPosition = Array.isArray(secondEvaluator?.positions)
    ? secondEvaluator?.positions[0]
    : secondEvaluator?.positions;

  if (!target?.department_id || !firstEvaluator?.department_id) {
    redirect(
      messageUrl(
        `/periods/${periodId}`,
        'error',
        '대상자 또는 1차 평가자의 부서가 없습니다.',
      ),
    );
  }

  const targetPositionName = targetPosition?.name ?? '';
  const targetIsDepartmentHeadOrLeader =
    targetPosition?.evaluation_role === 'leader' ||
    targetPositionName.includes('부서장') ||
    targetPositionName.includes('리더');

  if (!targetIsDepartmentHeadOrLeader) {
    // 일반 구성원은 2차 본부장 필수.
    if (!secondEvaluatorId) {
      redirect(
        messageUrl(
          `/periods/${periodId}`,
          'error',
          '일반 구성원 평가는 2차 평가자인 본부장이 필수입니다.',
        ),
      );
    }

    const firstIsDepartmentHead =
      firstPosition?.evaluation_role === 'leader' ||
      (firstPosition?.name ?? '').includes('부서장');

    if (
      !firstIsDepartmentHead ||
      target.department_id !== firstEvaluator.department_id ||
      assignment.employee_id === firstEvaluatorId
    ) {
      redirect(
        messageUrl(
          `/periods/${periodId}`,
          'error',
          '일반 구성원의 1차 평가자는 같은 부서의 부서장이어야 합니다.',
        ),
      );
    }
  } else {
    // 부서장/기존 리더는 1차 본부장 필수, 2차는 선택.
    if (
      !['division_head', 'executive'].includes(
        firstPosition?.evaluation_role ?? 'none',
      )
    ) {
      redirect(
        messageUrl(
          `/periods/${periodId}`,
          'error',
          '부서장·리더의 1차 평가자는 본부장이어야 합니다.',
        ),
      );
    }

    const descendantIds = new Set<string>();
    let frontier = [firstEvaluator.department_id];

    while (frontier.length > 0) {
      const next: string[] = [];

      for (const department of departments ?? []) {
        if (
          department.parent_id &&
          frontier.includes(department.parent_id) &&
          !descendantIds.has(department.id)
        ) {
          descendantIds.add(department.id);
          next.push(department.id);
        }
      }

      frontier = next;
    }

    const hasConfiguredSubOrganizations = descendantIds.size > 0;

    if (
      hasConfiguredSubOrganizations &&
      !descendantIds.has(target.department_id)
    ) {
      redirect(
        messageUrl(
          `/periods/${periodId}`,
          'error',
          '선택한 본부장의 산하 조직에 속한 부서장·리더가 아닙니다.',
        ),
      );
    }
  }

  if (
    secondEvaluatorId &&
    (!secondEvaluator ||
      !['division_head', 'executive'].includes(
        secondPosition?.evaluation_role ?? 'none',
      ))
  ) {
    redirect(
      messageUrl(
        `/periods/${periodId}`,
        'error',
        '2차 평가자는 본부장만 지정할 수 있습니다.',
      ),
    );
  }

  const { error } = await supabase
    .from('evaluation_assignments')
    .update({
      first_evaluator_id: firstEvaluatorId,
      second_evaluator_id: secondEvaluatorId || null,
      template_id: templateId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)
    .eq('period_id', periodId);

  if (error) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', error.message));
  }

  revalidatePath(`/periods/${periodId}`);
  redirect(messageUrl(`/periods/${periodId}`, 'success', '평가자 지정 정보를 수정했습니다.'));
}

export async function removeEvaluationTarget(periodId: string, assignmentId: string) {
  const status = await getPeriodStatus(periodId);

  if (!['draft', 'scheduled'].includes(status)) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', '평가가 시작된 이후에는 평가대상을 삭제할 수 없습니다.'));
  }

  const { supabase } = await requireHrAdmin();

  const { error } = await supabase
    .from('evaluation_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('period_id', periodId);

  if (error) {
    redirect(messageUrl(`/periods/${periodId}`, 'error', error.message));
  }

  revalidatePath(`/periods/${periodId}`);
  revalidatePath('/periods');
  redirect(messageUrl(`/periods/${periodId}`, 'success', '평가대상에서 제외했습니다.'));
}
export async function deleteEvaluationPeriodCompletely(
  periodId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const { supabase } = await requireHrAdmin();

    const { data, error } = await supabase.rpc('delete_evaluation_period_completely', {
      p_period_id: periodId,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath('/periods');
    revalidatePath('/dashboard');
    revalidatePath('/evaluations/self');
    revalidatePath('/evaluations/first');
    revalidatePath('/evaluations/second');
    revalidatePath('/evaluations/results');
    revalidatePath('/observations');
    revalidatePath('/calibration');
    revalidatePath('/nine-block');
    revalidatePath('/growth-plans');
    revalidatePath('/stats');

    const periodName = data?.period_name ?? '평가기간';
    const assignmentCount = data?.assignment_count ?? 0;

    return {
      ok: true,
      message:
        `${periodName} 영구삭제 완료 · 평가대상 ${assignmentCount}명과 ` +
        '해당 기간의 진단/평가/결과/Calibration/History/연결 성장계획 데이터도 함께 삭제되었습니다.',
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : '평가기간 삭제 중 오류가 발생했습니다.',
    };
  }
}
