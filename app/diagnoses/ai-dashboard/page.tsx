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
import { firstRelation } from '@/lib/diagnosis/utils';
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

function scoreText(value: number | null) {
  return value === null ? '-' : String(value);
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

  const [
    { data: diagnosisData, error: diagnosisError },
    { data: analysisData, error: analysisError },
  ] = selectedPeriodId
    ? await Promise.all([
        supabase
          .from('personnel_diagnoses')
          .select(
            'id,employee_id,status,updated_at,source_file_name,employees:employees!personnel_diagnoses_employee_id_fkey(name,employee_no,departments(name),positions(name))',
          )
          .eq('period_id', selectedPeriodId)
          .eq('status', 'completed')
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

  const currentAnalyses = rows
    .filter((row) => row.analysis && !row.stale)
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

  const pendingCount = rows.filter(
    (row) => !row.analysis || row.stale,
  ).length;

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
    if (!row.analysis || row.stale) continue;

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
  const returnTo = selectedPeriodId
    ? `/diagnoses/ai-dashboard?period=${selectedPeriodId}`
    : '/diagnoses/ai-dashboard';

  return (
    <PageShell
      title="AI 핵심가치 Dashboard"
      description="최종 인사진단을 AI가 성장·신뢰·전문성·감각 기준으로 근거 중심 분석한 조직 Alignment Dashboard입니다."
    >
      <Notice
        success={param(sp.success)}
        error={param(sp.error)}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <b>육성용 보조지표:</b> AI 점수는 구성원 피드백과 성장지원용입니다.
        보상·승진·징계·해고 등의 인사결정을 자동으로 결정하는 용도로 사용하지 않습니다.
        근거가 부족한 핵심가치는 점수를 만들지 않고 <b>근거 부족</b>으로 표시합니다.
      </div>

      {!apiConfigured && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          AI 분석을 실행하려면 Vercel 환경변수에 <b>OPENAI_API_KEY</b>를
          서버 전용으로 설정해야 합니다. `NEXT_PUBLIC_` 접두사는 붙이지 않습니다.
        </div>
      )}

      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="min-w-[280px] flex-1 text-sm font-semibold">
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

          <button className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">
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
              <div className="text-xs text-slate-500">최종 진단</div>
              <div className="mt-1 text-2xl font-black">{rows.length}명</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">AI 분석 완료</div>
              <div className="mt-1 text-2xl font-black">
                {currentAnalyses.length}명
              </div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">분석/재분석 필요</div>
              <div className="mt-1 text-2xl font-black">{pendingCount}명</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">조직 Alignment</div>
              <div className="mt-1 text-2xl font-black">
                {overallAverage === null ? '-' : `${overallAverage}점`}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {alignmentLevel(overallAverage)}
              </div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">가장 강한 가치</div>
              <div className="mt-1 text-lg font-black">
                {[
                  ['성장', growthAverage],
                  ['신뢰', trustAverage],
                  ['전문성', professionalismAverage],
                  ['감각', senseAverage],
                ]
                  .filter((item) => typeof item[1] === 'number')
                  .sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ?? '-'}
              </div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">우선 성장 가치</div>
              <div className="mt-1 text-lg font-black">
                {[
                  ['성장', growthAverage],
                  ['신뢰', trustAverage],
                  ['전문성', professionalismAverage],
                  ['감각', senseAverage],
                ]
                  .filter((item) => typeof item[1] === 'number')
                  .sort((a, b) => Number(a[1]) - Number(b[1]))[0]?.[0] ?? '-'}
              </div>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <Card>
              <div className="mb-2">
                <h2 className="font-black">조직 핵심가치 평균</h2>
                <p className="mt-1 text-xs text-slate-500">
                  근거 부족으로 점수가 없는 항목은 평균에서 제외합니다.
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

              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  ['성장', growthAverage],
                  ['신뢰', trustAverage],
                  ['전문성', professionalismAverage],
                  ['감각', senseAverage],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">{label}</div>
                    <div className="mt-1 text-xl font-black">
                      {typeof value === 'number' ? value : '-'}
                    </div>
                  </div>
                ))}
              </div>
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
                  최종 완료된 진단 중 미분석 또는 진단 수정 후 재분석이 필요한
                  구성원을 한 번에 최대 5명씩 분석합니다.
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
                    disabled={!apiConfigured || pendingCount === 0}
                    className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {pendingCount > 0
                      ? `미분석/재분석 ${Math.min(5, pendingCount)}명 AI 분석`
                      : '모두 최신 분석'}
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
                  <th className="px-4 py-3 text-right">인원</th>
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
                      최신 AI 분석 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          <Card className="overflow-x-auto p-0">
            <div className="border-b px-5 py-4">
              <h2 className="font-black">
                {selectedPeriod?.name ?? '평가기간'} · 개인 AI 분석 현황
              </h2>
            </div>

            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">구성원</th>
                  <th className="px-4 py-3 text-left">부서 / 직책</th>
                  <th className="px-4 py-3 text-right">성장</th>
                  <th className="px-4 py-3 text-right">신뢰</th>
                  <th className="px-4 py-3 text-right">전문성</th>
                  <th className="px-4 py-3 text-right">감각</th>
                  <th className="px-4 py-3 text-right">종합</th>
                  <th className="px-4 py-3 text-center">상태</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ diagnosis, analysis, stale }) => {
                  const employee = firstRelation(diagnosis.employees);
                  const department = firstRelation(employee?.departments);
                  const position = firstRelation(employee?.positions);

                  return (
                    <tr key={diagnosis.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-semibold">
                          {employee?.employee_no ?? '-'} · {employee?.name ?? '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {department?.name ?? '-'} · {position?.name ?? '-'}
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
                        {!analysis ? (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">
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
                          {analysis && !stale && (
                            <Link
                              href={`/diagnoses/ai-dashboard/${diagnosis.id}`}
                              className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                            >
                              Dashboard
                            </Link>
                          )}

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
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      이 평가기간에서 최종 완료된 인사진단이 없습니다.
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
