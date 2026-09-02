"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { useParams } from "next/navigation";

type CoreValueKey = "growth" | "trust" | "professional" | "sense";

type ValueDiagnosis = {
  key: CoreValueKey;
  name: string;
  aiScore: number | null;
  managerScore: number | null;
  finalScore: number | null;
  confidence: "높음" | "보통" | "낮음" | "판단불가";
  summary: string;
  strengths: string[];
  evidence: string[];
  direction: string;
};

type DiagnosisData = {
  employee: {
    id: string;
    name: string;
    department: string;
    position: string;
    period: string;
  };
  overallSummary: string;
  finalGrowthDirection: string;
  strengthTop3: string[];
  growthTop3: string[];
  values: ValueDiagnosis[];
  updatedAt?: string | null;
};

const VALUE_ORDER: CoreValueKey[] = [
  "growth",
  "trust",
  "professional",
  "sense",
];

const VALUE_LABEL: Record<CoreValueKey, string> = {
  growth: "성장",
  trust: "신뢰",
  professional: "전문성",
  sense: "감각",
};

function scoreText(score: number | null) {
  return score == null ? "-" : score.toFixed(1);
}

function confidenceClass(confidence: ValueDiagnosis["confidence"]) {
  if (confidence === "높음") return "bg-emerald-50 text-emerald-700";
  if (confidence === "보통") return "bg-amber-50 text-amber-700";
  if (confidence === "낮음") return "bg-orange-50 text-orange-700";
  return "bg-slate-100 text-slate-500";
}

function ScoreBox({
  label,
  score,
  strong = false,
}: {
  label: string;
  score: number | null;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          strong ? "text-slate-950" : "text-slate-700"
        }`}
      >
        {scoreText(score)}
      </p>
    </div>
  );
}

export default function EmployeeDiagnosisDashboardPage() {
  const params = useParams<{ employeeId: string }>();
  const employeeId = params?.employeeId;

  const [data, setData] = useState<DiagnosisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!employeeId) return;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/diagnosis/${employeeId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || "진단 결과를 불러오지 못했습니다.");
        }

        const result: DiagnosisData = await response.json();
        setData(result);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "진단 결과 조회 중 오류가 발생했습니다."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [employeeId]);

  const radarData = useMemo(() => {
    if (!data) return [];
    return VALUE_ORDER.map((key) => {
      const item = data.values.find((v) => v.key === key);
      return {
        value: VALUE_LABEL[key],
        score: item?.finalScore ?? item?.managerScore ?? item?.aiScore ?? 0,
      };
    });
  }, [data]);

  const totalScore = useMemo(() => {
    if (!data) return null;
    const scores = data.values
      .map((v) => v.finalScore ?? v.managerScore ?? v.aiScore)
      .filter((v): v is number => typeof v === "number");
    if (!scores.length) return null;
    return scores.reduce((sum, v) => sum + v, 0) / scores.length;
  }, [data]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-10 shadow-sm">
          <p className="text-slate-600">개인 진단 대시보드를 불러오는 중입니다.</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-10 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">진단 결과 조회 실패</h1>
          <p className="mt-3 text-slate-600">{error || "결과가 없습니다."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="rounded-2xl bg-white p-7 shadow-sm print:shadow-none">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                AMCOMPANY 인사진단 · 개인 대시보드
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                {data.employee.name}
              </h1>
              <p className="mt-2 text-slate-600">
                {data.employee.department} · {data.employee.position}
              </p>
            </div>

            <div className="flex items-end gap-3">
              <div className="text-left md:text-right">
                <p className="text-xs font-medium text-slate-500">진단기간</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {data.employee.period}
                </p>
                {data.updatedAt && (
                  <p className="mt-1 text-xs text-slate-400">
                    최근 확정/수정: {new Date(data.updatedAt).toLocaleString("ko-KR")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="print:hidden rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                인쇄 / PDF
              </button>
            </div>
          </div>
        </section>

        {/* Summary + Radar */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-7 shadow-sm print:shadow-none">
            <p className="text-sm font-medium text-slate-500">핵심가치 종합점수</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-5xl font-bold text-slate-950">
                {scoreText(totalScore)}
              </span>
              <span className="mb-1 text-lg text-slate-400">/ 5.0</span>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              {data.values.map((item) => (
                <div key={item.key} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">{item.name}</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {scoreText(
                      item.finalScore ?? item.managerScore ?? item.aiScore
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-7 shadow-sm lg:col-span-2 print:shadow-none">
            <p className="font-semibold text-slate-800">핵심가치 Balance</p>
            <p className="mt-1 text-xs text-slate-500">
              최종점수 → 부서장점수 → AI제안점수 순으로 표시됩니다.
            </p>

            <div className="mt-3 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="value" tick={{ fontSize: 14 }} />
                  <PolarRadiusAxis domain={[0, 5]} tickCount={6} />
                  <Radar
                    dataKey="score"
                    stroke="#334155"
                    fill="#64748b"
                    fillOpacity={0.22}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Overall summary */}
        <section className="rounded-2xl bg-white p-7 shadow-sm print:shadow-none">
          <p className="text-sm font-medium text-slate-500">AI 종합 진단</p>
          <p className="mt-3 whitespace-pre-wrap leading-8 text-slate-700">
            {data.overallSummary}
          </p>
        </section>

        {/* Top3 */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-7 shadow-sm print:shadow-none">
            <p className="text-sm font-medium text-slate-500">핵심 강점</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Strength TOP 3
            </h2>
            <div className="mt-5 space-y-3">
              {data.strengthTop3.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-800">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-7 shadow-sm print:shadow-none">
            <p className="text-sm font-medium text-slate-500">성장 필요 영역</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Growth TOP 3
            </h2>
            <div className="mt-5 space-y-3">
              {data.growthTop3.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-sm font-bold text-slate-700">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-800">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Detailed values */}
        <section className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              성장 · 신뢰 · 전문성 · 감각
            </p>
            <h2 className="text-2xl font-bold text-slate-950">
              핵심가치별 상세 진단
            </h2>
          </div>

          {data.values.map((item) => (
            <article
              key={item.key}
              className="break-inside-avoid rounded-2xl bg-white p-7 shadow-sm print:shadow-none"
            >
              <div className="flex flex-col justify-between gap-5 xl:flex-row">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-bold text-slate-950">
                      {item.name}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceClass(
                        item.confidence
                      )}`}
                    >
                      근거 충분도 {item.confidence}
                    </span>
                  </div>
                  <p className="mt-3 max-w-3xl leading-7 text-slate-700">
                    {item.summary}
                  </p>
                </div>

                <div className="grid min-w-[360px] grid-cols-3 gap-2">
                  <ScoreBox label="AI 제안" score={item.aiScore} />
                  <ScoreBox label="부서장 평가" score={item.managerScore} />
                  <ScoreBox label="최종 확정" score={item.finalScore} strong />
                </div>
              </div>

              <div className="mt-7 grid gap-6 lg:grid-cols-3">
                <div>
                  <p className="text-sm font-bold text-slate-500">
                    관찰된 강점
                  </p>
                  <ul className="mt-3 space-y-2">
                    {item.strengths.length ? (
                      item.strengths.map((v, i) => (
                        <li
                          key={`${v}-${i}`}
                          className="flex gap-2 text-sm leading-6 text-slate-700"
                        >
                          <span>•</span>
                          <span>{v}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-slate-400">확인된 내용 없음</li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-500">
                    AI 판단 근거
                  </p>
                  <ul className="mt-3 space-y-2">
                    {item.evidence.length ? (
                      item.evidence.map((v, i) => (
                        <li
                          key={`${v}-${i}`}
                          className="flex gap-2 text-sm leading-6 text-slate-700"
                        >
                          <span>•</span>
                          <span>{v}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-slate-400">
                        판단 가능한 구체적 근거가 부족합니다.
                      </li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-500">성장 방향</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {item.direction || "추가 관찰 후 성장 방향을 설정합니다."}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Growth direction */}
        <section className="rounded-2xl bg-slate-950 p-7 text-white shadow-sm print:bg-white print:text-slate-900 print:shadow-none print:border print:border-slate-200">
          <p className="text-sm text-slate-400 print:text-slate-500">
            Growth Direction
          </p>
          <h2 className="mt-2 text-2xl font-bold">최종 성장 방향</h2>
          <p className="mt-4 max-w-5xl whitespace-pre-wrap leading-8 text-slate-300 print:text-slate-700">
            {data.finalGrowthDirection}
          </p>
        </section>

        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-xs leading-6 text-slate-500 print:shadow-none">
          AI 분석 결과는 관찰기록과 평가자료를 구조화하여 평가자의 판단을 보조하는 자료입니다.
          최종 평가는 부서장/본부장 등 지정 평가자가 근거를 검토한 뒤 확정하는 구조를 전제로 합니다.
          근거가 부족한 핵심가치는 억지로 점수화하지 않고 “판단불가”로 표시할 수 있습니다.
        </section>
      </div>
    </main>
  );
}
