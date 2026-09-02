import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { CoreValueRadar } from '@/components/diagnosis/CoreValueRadar';
import { AIAnalysisProgressButton } from '@/components/diagnosis/AIAnalysisProgressButton';
import {
  alignmentLevel,
  type CoreValueResult,
} from '@/lib/ai/core-value-analysis';
import { firstRelation } from '@/lib/diagnosis/utils';
import { getEvaluationAccess } from '@/lib/evaluation/access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : '';
}

function valueResult(
  coreValues: any,
  key: string,
): CoreValueResult {
  const value = coreValues?.[key] ?? {};

  return {
    status:
      value.status === 'insufficient_evidence'
        ? 'insufficient_evidence'
        : 'scored',
    score:
      typeof value.score === 'number' ? value.score : null,
    confidence:
      value.confidence === 'high'
        ? 'high'
        : value.confidence === 'medium'
          ? 'medium'
          : 'low',
    evidence: Array.isArray(value.evidence) ? value.evidence : [],
    rationale:
      typeof value.rationale === 'string' ? value.rationale : '',
    growth_action:
      typeof value.growth_action === 'string'
        ? value.growth_action
        : '',
  };
}

const valueMeta = [
  ['growth', '성장'],
  ['trust', '신뢰'],
  ['professionalism', '전문성'],
  ['sense', '감각'],
] as const;

export default async function IndividualAIDashboardPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user } = await getEvaluationAccess();

  const admin = user.roles.some((role) =>
    ['hr_admin', 'super_admin'].includes(role),
  );

  if (!admin) {
    notFound();
  }

  const [
    { data: diagnosis, error: diagnosisError },
    { data: analysis, error: analysisError },
  ] = await Promise.all([
    supabase
      .from('personnel_diagnoses')
      .select(
        'id,period_id,status,updated_at,diagnosis_summary,growth_points,growth_directions,other_comment,employees:employees!personnel_diagnoses_employee_id_fkey(name,employee_no,departments(name),job_levels(name),positions(name)),evaluation_periods(name)',
      )
      .eq('id', id)
      .single(),
    supabase
      .from('core_value_ai_analyses')
      .select('*')
      .eq('diagnosis_id', id)
      .maybeSingle(),
  ]);

  if (diagnosisError || !diagnosis) notFound();

  const employee = firstRelation(diagnosis.employees);
  const department = firstRelation(employee?.departments);
  const jobLevel = firstRelation(employee?.job_levels);
  const position = firstRelation(employee?.positions);
  const period = firstRelation(diagnosis.evaluation_periods);

  const stale =
    !!analysis &&
    analysis.source_diagnosis_updated_at !== diagnosis.updated_at;

  const apiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const returnTo = `/diagnoses/ai-dashboard/${id}`;

  if (analysisError) {
    return (
      <PageShell
        title={`${employee?.name ?? '구성원'} AI 핵심가치 Dashboard`}
        description="핵심가치 분석 결과를 확인합니다."
      >
        <Card>
          <div className="py-10 text-center text-red-600">
            AI 분석 데이터를 읽지 못했습니다: {analysisError.message}
          </div>
        </Card>
      </PageShell>
    );
  }

  if (!analysis || stale) {
    return (
      <PageShell
        title={`${employee?.name ?? '구성원'} AI 핵심가치 Dashboard`}
        description="최종 인사진단을 성장·신뢰·전문성·감각 기준으로 분석합니다."
      >
        <Notice
          success={param(sp.success)}
          error={param(sp.error)}
        />

        <Card>
          <div className="py-10 text-center">
            <div className="text-lg font-black">
              {stale ? '진단내용이 변경되어 재분석이 필요합니다.' : '아직 AI 분석이 없습니다.'}
            </div>
            <div className="mt-2 text-sm text-slate-500">
              {employee?.employee_no ?? '-'} · {employee?.name ?? '-'} ·{' '}
              {department?.name ?? '-'} · {position?.name ?? '-'}
            </div>

            {diagnosis.status !== 'completed' ? (
              <div className="mt-5 text-sm font-semibold text-amber-700">
                인사진단을 최종 완료한 뒤 AI 분석할 수 있습니다.
              </div>
            ) : (
              <div className="mt-5 flex justify-center">
                {apiConfigured && (
                  <AIAnalysisProgressButton
                    diagnosisId={id}
                    label={stale ? 'AI 재분석' : 'AI 핵심가치 분석'}
                    className="w-full rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                  />
                )}
              </div>
            )}

            {!apiConfigured && (
              <div className="mt-4 text-xs text-red-600">
                OPENAI_API_KEY 환경변수가 필요합니다.
              </div>
            )}
          </div>
        </Card>
      </PageShell>
    );
  }

  const coreValues = analysis.core_values ?? {};
  const values = {
    growth: valueResult(coreValues, 'growth'),
    trust: valueResult(coreValues, 'trust'),
    professionalism: valueResult(coreValues, 'professionalism'),
    sense: valueResult(coreValues, 'sense'),
  };

  return (
    <PageShell
      title={`${employee?.name ?? '구성원'} AI 핵심가치 Dashboard`}
      description={`${period?.name ?? ''} 인사진단 기반 · 성장·신뢰·전문성·감각 Alignment`}
    >
      <Notice
        success={param(sp.success)}
        error={param(sp.error)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-bold">
            {employee?.employee_no ?? '-'} · {employee?.name ?? '-'}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {department?.name ?? '-'} · {jobLevel?.name ?? '-'} ·{' '}
            {position?.name ?? '-'}
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/diagnoses/${id}`}
            className="rounded-xl border px-4 py-2 text-sm font-semibold"
          >
            원본 진단
          </Link>
          <Link
            href={`/diagnoses/ai-dashboard?period=${diagnosis.period_id}`}
            className="rounded-xl border px-4 py-2 text-sm font-semibold"
          >
            조직 Dashboard
          </Link>
          <AIAnalysisProgressButton
            diagnosisId={id}
            label="다시 분석"
            className="w-full rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          />
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        이 Dashboard는 <b>육성·피드백용 AI 보조분석</b>입니다.
        점수 하나만으로 인사 의사결정을 하지 않고 아래 판단근거를 함께 확인합니다.
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="text-center">
            <div className="text-xs font-semibold text-slate-500">
              CORE VALUE ALIGNMENT
            </div>
            <div className="mt-2 text-5xl font-black">
              {analysis.overall_alignment_score ?? '-'}
            </div>
            <div className="mt-2 text-sm font-bold text-blue-700">
              {alignmentLevel(analysis.overall_alignment_score)}
            </div>
          </div>

          <CoreValueRadar
            items={[
              { label: '성장', value: analysis.growth_score },
              { label: '신뢰', value: analysis.trust_score },
              { label: '전문성', value: analysis.professionalism_score },
              { label: '감각', value: analysis.sense_score },
            ]}
          />
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          {valueMeta.map(([key, label]) => {
            const value = values[key];

            return (
              <Card key={key}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-black">{label}</div>
                    <div className="mt-1 text-3xl font-black">
                      {value.score ?? '-'}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="rounded-full bg-slate-100 px-2 py-1 font-semibold">
                      신뢰도 {value.confidence === 'high'
                        ? '높음'
                        : value.confidence === 'medium'
                          ? '보통'
                          : '낮음'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs font-semibold text-slate-500">
                  {alignmentLevel(value.score)}
                </div>

                <div className="mt-3 text-sm leading-6 text-slate-700">
                  {value.rationale || '판단근거가 충분하지 않습니다.'}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="font-black">AI 종합진단</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {analysis.overall_summary || '-'}
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-bold">핵심 강점</div>
              <div className="mt-2 space-y-2">
                {(analysis.strengths ?? []).map(
                  (item: string, index: number) => (
                    <div
                      key={index}
                      className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
                    >
                      {item}
                    </div>
                  ),
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-bold">우선 성장영역</div>
              <div className="mt-2 space-y-2">
                {(analysis.growth_areas ?? []).map(
                  (item: string, index: number) => (
                    <div
                      key={index}
                      className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"
                    >
                      {item}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-black">추천 성장 행동</h2>
          <div className="mt-3 space-y-3">
            {(analysis.recommended_actions ?? []).map(
              (item: string, index: number) => (
                <div
                  key={index}
                  className="flex gap-3 rounded-xl border p-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-700">
                    {index + 1}
                  </div>
                  <div className="text-sm leading-6 text-slate-700">
                    {item}
                  </div>
                </div>
              ),
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4">
        {valueMeta.map(([key, label]) => {
          const value = values[key];

          return (
            <Card key={key}>
              <div className="grid gap-5 xl:grid-cols-[180px_1fr_1fr]">
                <div>
                  <div className="text-lg font-black">{label}</div>
                  <div className="mt-2 text-4xl font-black">
                    {value.score ?? '-'}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {value.status === 'insufficient_evidence'
                      ? '근거 부족'
                      : alignmentLevel(value.score)}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-bold">AI 판단 근거</div>
                  <div className="mt-2 space-y-2">
                    {value.evidence.length > 0 ? (
                      value.evidence.map((item, index) => (
                        <div
                          key={index}
                          className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6"
                        >
                          {item}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-400">
                        충분한 근거가 없습니다.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-bold">성장 행동 제안</div>
                  <div className="mt-2 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                    {value.growth_action || '추가 관찰 후 성장 행동을 설정합니다.'}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="text-right text-xs text-slate-400">
        AI model: {analysis.model} · Prompt: {analysis.prompt_version} · Revision{' '}
        {analysis.analysis_revision} · 분석{' '}
        {analysis.analyzed_at
          ? new Date(analysis.analyzed_at).toLocaleString('ko-KR')
          : '-'}
      </div>
    </PageShell>
  );
}
