import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { CoreValueRadar } from '@/components/diagnosis/CoreValueRadar';
import {
  analyzeDiagnosisAction,
  analyzePeriodBatchAction,
} from '@/app/diagnoses/ai-actions';
import { alignmentLevel } from '@/lib/ai/core-value-analysis';
import {
  firstRelation,
  diagnosisStatusLabel,
} from '@/lib/diagnosis/utils';
import { getEvaluationAccess } from '@/lib/evaluation/access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : '';
}

function average(values: Array<number | null | undefined>) {
  const nums = values.filter(
    (value): value is number => typeof value === 'number',
  );

  if (nums.length === 0) return null;

  return Math.round(
    nums.reduce((sum, value) => sum + value, 0) / nums.length,
  );
}

function scoreText(value: number | null | undefined) {
  return typeof value === 'number' ? String(value) : '-';
}

function statusTone(status: string) {
  if (status === 'completed') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (
    status === 'department_head_in_progress' ||
    status === 'department_head_completed' ||
    status === 'headquarters_head_in_progress'
  ) {
    return 'bg-blue-50 text-blue-700';
  }

  return 'bg-slate-100 text-slate-700';
}

export default async function AICoreValueDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { supabase, user } = await getEvaluationAccess();

  const admin = user.roles.some((role) =>
    ['hr_admin', 'super_admin'].includes(role),
  );

  if (!admin) {
    return (
      <PageShell
        title="AI 핵심가치 Dashboard"
        description="AMCOMPANY 핵심가치 Alignment를 확인합니다."
      >
        <Card>
          <div className="py-10 text-center text-sm text-slate-500">
            HR 관리자만 조직 AI Dashboard를 볼 수 있습니다.
          </div>
        </Card>
      </PageShell>
    );
  }

  const { data: periods } = await supabase
    .from('evaluation_periods')
    .select('id,name,status,start_date')
    .order('start_date', { ascending: false });

  const requestedPeriod = param(sp.period);
  const selectedPeriodId =
    (periods ?? []).some((period: any) => period.id === requestedPeriod)
      ? requestedPeriod
      : periods?.[0]?.id ?? '';

  const selectedPeriod = (periods ?? []).find(
    (period: any) => period.id === selectedPeriodId,
  );

  const requestedEmployee = param(sp.employee);

  const [
    { data: diagnosisData, error: diagnosisError },
    { data: analysisData, error: analysisError },
  ] = selectedPeriodId
    ? await Promise.all([
        supabase
          .from('personnel_diagnoses')
          .select(
            'id,employee_id,status,subject_is_department_head,updated_at,source_file_name,source_uploaded_at,diagnosis_summary,growth_points,growth_directions,other_comment,department_head_id,headquarters_head_id,employees:employees!personnel_diagnoses_employee_id_fkey(name,employee_no,departments(name),job_levels(name),positions(name))',
          )
          .eq('period_id', selectedPeriodId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('core_value_ai_analyses')
          .select('*')
          .eq('period_id', selectedPeriodId),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  const loadError = diagnosisError || analysisError;

  const diagnoses = (diagnosisData ?? []) as any[];
  const analyses = (analysisData ?? []) as any[];

  const analysisMap = new Map(
    analyses.map((analysis) => [analysis.diagnosis_id, analysis]),
  );

  const rows = diagnoses.map((diagnosis) => {
    const analysis = analysisMap.get(diagnosis.id) ?? null;
    const stale =
      !!analysis &&
      analysis.source_diagnosis_updated_at !== diagnosis.updated_at;

    return { diagnosis, analysis, stale };
  });

  const employeeOptions = rows
    .map(({ diagnosis }) => {
      const employee = firstRelation(diagnosis.employees);
      const department = firstRelation(employee?.departments);

      return {
        diagnosisId: diagnosis.id,
        employeeId: diagnosis.employee_id,
        employeeNo: employee?.employee_no ?? '',
        name: employee?.name ?? '',
        department: department?.name ?? '',
      };
    })
    .sort((a, b) =>
      `${a.department}${a.employeeNo}${a.name}`.localeCompare(
        `${b.department}${b.employeeNo}${b.name}`,
        'ko',
      ),
    );

  const selectedEmployeeId =
    employeeOptions.some((item) => item.employeeId === requestedEmployee)
      ? requestedEmployee
      : '';

  const selectedRow = selectedEmployeeId
    ? rows.find(
        ({ diagnosis }) => diagnosis.employee_id === selectedEmployeeId,
      ) ?? null
    : null;

  const currentAnalyses = rows
    .filter(
      (row) =>
        row.diagnosis.status === 'completed' &&
        row.analysis &&
        !row.stale,
    )
    .map((row) => row.analysis);

  const growthAverage = average(
    currentAnalyses.map((row) => row.growth_score),
  );
  const trustAverage = average(
    currentAnalyses.map((row) => row.trust_score),
  );
  const professionalismAverage = average(
    currentAnalyses.map((row) => row.professionalism_score),
  );
  const senseAverage = average(
    currentAnalyses.map((row) => row.sense_score),
  );
  const overallAverage = average(
    currentAnalyses.map((row) => row.overall_alignment_score),
  );

  const completedDiagnoses = rows.filter(
    (row) => row.diagnosis.status === 'completed',
  );

  const inProgressDiagnoses = rows.filter(
    (row) => row.diagnosis.status !== 'completed',
  );

  const pendingAI = completedDiagnoses.filter(
    (row) => !row.analysis || row.stale,
  );

  const distribution = {
    veryHigh: currentAnalyses.filter(
      (row) => (row.overall_alignment_score ?? -1) >= 90,
    ).length,
    stable: currentAnalyses.filter(
      (row) =>
        (row.overall_alignment_score ?? -1) >= 75 &&
        (row.overall_alignment_score ?? -1) < 90,
    ).length,
    basic: currentAnalyses.filter(
      (row) =>
        (row.overall_alignment_score ?? -1) >= 60 &&
        (row.overall_alignment_score ?? -1) < 75,
    ).length,
    growth: currentAnalyses.filter(
      (row) =>
        (row.overall_alignment_score ?? -1) >= 40 &&
        (row.overall_alignment_score ?? -1) < 60,
    ).length,
    intensive: currentAnalyses.filter(
      (row) =>
        typeof row.overall_alignment_score === 'number' &&
        row.overall_alignment_score < 40,
    ).length,
  };

  const departmentBuckets = new Map<
    string,
    {
      count: number;
      growth: Array<number | null>;
      trust: Array<number | null>;
      professionalism: Array<number | null>;
      sense: Array<number | null>;
      overall: Array<number | null>;
    }
  >();

  for (const row of rows) {
    if (
      row.diagnosis.status !== 'completed' ||
      !row.analysis ||
      row.stale
    ) {
      continue;
    }

    const employee = firstRelation(row.diagnosis.employees);
    const department = firstRelation(employee?.departments);
    const departmentName = department?.name ?? '부서 미지정';

    const bucket =
      departmentBuckets.get(departmentName) ??
      {
        count: 0,
        growth: [],
        trust: [],
        professionalism: [],
        sense: [],
        overall: [],
      };

    bucket.count += 1;
    bucket.growth.push(row.analysis.growth_score);
    bucket.trust.push(row.analysis.trust_score);
    bucket.professionalism.push(row.analysis.professionalism_score);
    bucket.sense.push(row.analysis.sense_score);
    bucket.overall.push(row.analysis.overall_alignment_score);

    departmentBuckets.set(departmentName, bucket);
  }

  const departmentRows = [...departmentBuckets.entries()]
    .map(([name, values]) => ({
      name,
      count: values.count,
      growth: average(values.growth),
      trust: average(values.trust),
      professionalism: average(values.professionalism),
      sense: average(values.sense),
      overall: average(values.overall),
    }))
    .sort(
      (a, b) =>
        (b.overall ?? -1) - (a.overall ?? -1),
    );

  const apiConfigured = Boolean(process.env.OPENAI_API_KEY);

  const queryParams = new URLSearchParams();

  if (selectedPeriodId) {
    queryParams.set('period', selectedPeriodId);
  }

  if (selectedEmployeeId) {
    queryParams.set('employee', selectedEmployeeId);
  }

  const returnTo = `/diagnoses/ai-dashboard${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`;

  return (
    <PageShell
      title="AI 핵심가치 Dashboard"
      description="평가기간의 전체 인사진단 진행현황과 최종 진단의 성장·신뢰·전문성·감각 Alignment를 확인합니다."
    >
      <Notice
        success={param(sp.success)}
        error={param(sp.error)}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <b>육성용 보조지표:</b> 작성중 진단도 Dashboard에는 즉시 표시합니다.
        AI 분석은 본부장 성장방향까지 포함해 최종 완료된 인사진단에만 실행합니다.
      </div>

      {!apiConfigured && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          AI 분석을 실행하려면 Vercel 서버 환경변수 <b>OPENAI_API_KEY</b>가 필요합니다.
        </div>
      )}

      <Card>
        <form method="get" className="grid gap-4 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
          <label className="text-sm font-semibold">
            평가기간
            <select
              name="period"
              defaultValue={selectedPeriodId}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              {(periods ?? []).map((period: any) => (
                <option key={period.id} value={period.id}>
                  {period.name} · {period.status}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold">
            직원 개별 조회
            <select
              name="employee"
              defaultValue={selectedEmployeeId}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              <option value="">전체 직원</option>
              {employeeOptions.map((employee) => (
                <option
                  key={employee.diagnosisId}
                  value={employee.employeeId}
                >
                  {employee.employeeNo} · {employee.name} · {employee.department}
                </option>
              ))}
            </select>
          </label>

          <button className="rounded-xl border bg-white px-5 py-2.5 text-sm font-semibold">
            조회
          </button>
        </form>
      </Card>

      {loadError ? (
        <Card>
          <div className="py-10 text-center text-sm text-red-600">
            Dashboard 데이터를 불러오지 못했습니다: {loadError.message}
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Card>
              <div className="text-xs text-slate-500">등록된 진단</div>
              <div className="mt-1 text-2xl font-black">{rows.length}명</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">작성 진행중</div>
              <div className="mt-1 text-2xl font-black">{inProgressDiagnoses.length}명</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">최종 완료</div>
              <div className="mt-1 text-2xl font-black">{completedDiagnoses.length}명</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">AI 분석 완료</div>
              <div className="mt-1 text-2xl font-black">{currentAnalyses.length}명</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">AI 분석/재분석 필요</div>
              <div className="mt-1 text-2xl font-black">{pendingAI.length}명</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">조직 Alignment</div>
              <div className="mt-1 text-2xl font-black">
                {overallAverage === null ? '-' : `${overallAverage}점`}
              </div>
              <div className="mt-1 text-xs text-slate-500">{alignmentLevel(overallAverage)}</div>
            </Card>
          </div>

          {selectedRow && (() => {
            const employee = firstRelation(selectedRow.diagnosis.employees);
            const department = firstRelation(employee?.departments);
            const jobLevel = firstRelation(employee?.job_levels);
            const position = firstRelation(employee?.positions);
            const analysis = selectedRow.analysis;
            const ready = selectedRow.diagnosis.status === 'completed';

            return (
              <Card className="border-blue-200">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-blue-700">직원 개별 조회</div>
                    <h2 className="mt-1 text-xl font-black">
                      {employee?.employee_no ?? '-'} · {employee?.name ?? '-'}
                    </h2>
                    <div className="mt-1 text-sm text-slate-500">
                      {department?.name ?? '-'} · {jobLevel?.name ?? '-'} · {position?.name ?? '-'}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(
                          selectedRow.diagnosis.status,
                        )}`}
                      >
                        {diagnosisStatusLabel(
                          selectedRow.diagnosis.status,
                          selectedRow.diagnosis.subject_is_department_head,
                        )}
                      </span>

                      {!analysis ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                          AI 분석 없음
                        </span>
                      ) : selectedRow.stale ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          AI 재분석 필요
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          AI 분석 완료
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/diagnoses/${selectedRow.diagnosis.id}`}
                      className="rounded-xl border px-4 py-2 text-sm font-semibold"
                    >
                      원본 인사진단
                    </Link>

                    {analysis && !selectedRow.stale && (
                      <Link
                        href={`/diagnoses/ai-dashboard/${selectedRow.diagnosis.id}`}
                        className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white"
                      >
                        개인 AI Dashboard
                      </Link>
                    )}

                    {ready && (
                      <form
                        action={analyzeDiagnosisAction.bind(
                          null,
                          selectedRow.diagnosis.id,
                          returnTo,
                        )}
                      >
                        <button
                          disabled={!apiConfigured}
                          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                        >
                          {!analysis
                            ? 'AI 분석'
                            : selectedRow.stale
                              ? 'AI 재분석'
                              : '다시 분석'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {!ready ? (
                  <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-700">
                    아직 인사진단 최종완료 전입니다. 현재 내용은 <b>원본 인사진단</b>에서 확인할 수 있고,
                    본부장 성장방향까지 완료되면 AI 핵심가치 분석이 가능합니다.
                  </div>
                ) : analysis && !selectedRow.stale ? (
                  <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
                    <CoreValueRadar
                      items={[
                        { label: '성장', value: analysis.growth_score },
                        { label: '신뢰', value: analysis.trust_score },
                        { label: '전문성', value: analysis.professionalism_score },
                        { label: '감각', value: analysis.sense_score },
                      ]}
                    />
                    <div>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                        {[
                          ['성장', analysis.growth_score],
                          ['신뢰', analysis.trust_score],
                          ['전문성', analysis.professionalism_score],
                          ['감각', analysis.sense_score],
                          ['종합', analysis.overall_alignment_score],
                        ].map(([label, score]) => (
                          <div key={String(label)} className="rounded-xl bg-slate-50 p-3 text-center">
                            <div className="text-xs text-slate-500">{label}</div>
                            <div className="mt-1 text-2xl font-black">
                              {scoreText(score as number | null)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4">
                        <div className="text-sm font-bold">AI 종합진단</div>
                        <div className="mt-2 rounded-xl bg-blue-50 p-4 text-sm leading-7 text-slate-800">
                          {analysis.overall_summary || '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-blue-50 p-5 text-sm text-blue-900">
                    최종 인사진단은 완료되어 있습니다. <b>AI 분석</b>을 실행하면 이 직원의
                    성장·신뢰·전문성·감각 점수와 판단근거를 확인할 수 있습니다.
                  </div>
                )}
              </Card>
            );
          })()}

          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <Card>
              <div className="mb-2">
                <h2 className="font-black">조직 핵심가치 평균</h2>
                <p className="mt-1 text-xs text-slate-500">
                  최종완료 + 최신 AI 분석이 있는 구성원만 평균에 포함됩니다.
                </p>
              </div>
              <CoreValueRadar
                items={[
                  { label: '성장', value: growthAverage },
                  { label: '신뢰', value: trustAverage },
                  { label: '전문성', value: professionalismAverage },
                  { label: '감각', value: senseAverage },
                ]}
              />
            </Card>

            <Card>
              <h2 className="font-black">Alignment 분포</h2>
              <div className="mt-4 space-y-3">
                {[
                  ['매우 높은 Alignment', distribution.veryHigh, '90~100'],
                  ['안정적 Alignment', distribution.stable, '75~89'],
                  ['기본 Alignment', distribution.basic, '60~74'],
                  ['성장 필요', distribution.growth, '40~59'],
                  ['집중 성장 필요', distribution.intensive, '0~39'],
                ].map(([label, count, range]) => (
                  <div
                    key={String(label)}
                    className="flex items-center justify-between rounded-xl border p-3"
                  >
                    <div>
                      <div className="text-sm font-bold">{label}</div>
                      <div className="text-xs text-slate-400">{range}점</div>
                    </div>
                    <div className="text-xl font-black">{count}명</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black">AI 분석 실행</h2>
                <p className="mt-1 text-xs text-slate-500">
                  최종완료된 진단 중 미분석 또는 재분석이 필요한 구성원만 분석합니다.
                </p>
              </div>

              {selectedPeriodId && (
                <form
                  action={analyzePeriodBatchAction.bind(
                    null,
                    selectedPeriodId,
                    returnTo,
                  )}
                >
                  <button
                    disabled={!apiConfigured || pendingAI.length === 0}
                    className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {pendingAI.length > 0
                      ? `미분석/재분석 ${Math.min(5, pendingAI.length)}명 AI 분석`
                      : '최종완료 진단 모두 최신 분석'}
                  </button>
                </form>
              )}
            </div>
          </Card>

          <Card className="overflow-x-auto p-0">
            <div className="border-b px-5 py-4">
              <h2 className="font-black">부서별 핵심가치 Alignment</h2>
            </div>
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">부서</th>
                  <th className="px-4 py-3 text-right">AI 분석인원</th>
                  <th className="px-4 py-3 text-right">성장</th>
                  <th className="px-4 py-3 text-right">신뢰</th>
                  <th className="px-4 py-3 text-right">전문성</th>
                  <th className="px-4 py-3 text-right">감각</th>
                  <th className="px-4 py-3 text-right">종합</th>
                </tr>
              </thead>
              <tbody>
                {departmentRows.map((row) => (
                  <tr key={row.name} className="border-t">
                    <td className="px-4 py-3 font-semibold">{row.name}</td>
                    <td className="px-4 py-3 text-right">{row.count}</td>
                    <td className="px-4 py-3 text-right">{scoreText(row.growth)}</td>
                    <td className="px-4 py-3 text-right">{scoreText(row.trust)}</td>
                    <td className="px-4 py-3 text-right">{scoreText(row.professionalism)}</td>
                    <td className="px-4 py-3 text-right">{scoreText(row.sense)}</td>
                    <td className="px-4 py-3 text-right font-black">{scoreText(row.overall)}</td>
                  </tr>
                ))}
                {departmentRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      아직 최신 AI 분석 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          <Card className="overflow-x-auto p-0">
            <div className="border-b px-5 py-4">
              <h2 className="font-black">
                {selectedPeriod?.name ?? '평가기간'} · 직원별 인사진단 / AI 현황
              </h2>
            </div>

            <table className="w-full min-w-[1180px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">구성원</th>
                  <th className="px-4 py-3 text-left">부서 / 직책</th>
                  <th className="px-4 py-3 text-center">인사진단 상태</th>
                  <th className="px-4 py-3 text-right">성장</th>
                  <th className="px-4 py-3 text-right">신뢰</th>
                  <th className="px-4 py-3 text-right">전문성</th>
                  <th className="px-4 py-3 text-right">감각</th>
                  <th className="px-4 py-3 text-right">종합</th>
                  <th className="px-4 py-3 text-center">AI 상태</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>

              <tbody>
                {rows.map(({ diagnosis, analysis, stale }) => {
                  const employee = firstRelation(diagnosis.employees);
                  const department = firstRelation(employee?.departments);
                  const position = firstRelation(employee?.positions);
                  const completed = diagnosis.status === 'completed';

                  return (
                    <tr
                      key={diagnosis.id}
                      className={
                        selectedEmployeeId === diagnosis.employee_id
                          ? 'border-t bg-blue-50/40'
                          : 'border-t'
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold">
                          {employee?.employee_no ?? '-'} · {employee?.name ?? '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {department?.name ?? '-'} · {position?.name ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(
                            diagnosis.status,
                          )}`}
                        >
                          {diagnosisStatusLabel(
                            diagnosis.status,
                            diagnosis.subject_is_department_head,
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {analysis && !stale ? scoreText(analysis.growth_score) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {analysis && !stale ? scoreText(analysis.trust_score) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {analysis && !stale ? scoreText(analysis.professionalism_score) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {analysis && !stale ? scoreText(analysis.sense_score) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-black">
                        {analysis && !stale
                          ? scoreText(analysis.overall_alignment_score)
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!completed ? (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            진단 완료 대기
                          </span>
                        ) : !analysis ? (
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                            AI 분석 대기
                          </span>
                        ) : stale ? (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            재분석 필요
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            분석 완료
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/diagnoses/ai-dashboard?period=${selectedPeriodId}&employee=${diagnosis.employee_id}`}
                            className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                          >
                            개별 조회
                          </Link>

                          <Link
                            href={`/diagnoses/${diagnosis.id}`}
                            className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                          >
                            진단 보기
                          </Link>

                          {analysis && !stale && (
                            <Link
                              href={`/diagnoses/ai-dashboard/${diagnosis.id}`}
                              className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              AI Dashboard
                            </Link>
                          )}

                          {completed && (
                            <form
                              action={analyzeDiagnosisAction.bind(
                                null,
                                diagnosis.id,
                                returnTo,
                              )}
                            >
                              <button
                                disabled={!apiConfigured}
                                className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                              >
                                {!analysis
                                  ? 'AI 분석'
                                  : stale
                                    ? '재분석'
                                    : '다시 분석'}
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                      이 평가기간에 등록된 인사진단이 없습니다.
                      Excel 업로드 화면에서 해당 평가기간으로 정상 등록되었는지 확인해주세요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </PageShell>
  );
}
