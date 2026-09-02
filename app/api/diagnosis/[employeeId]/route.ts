import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CoreValueKey = "growth" | "trust" | "professional" | "sense";

const LABELS: Record<CoreValueKey, string> = {
  growth: "성장",
  trust: "신뢰",
  professional: "전문성",
  sense: "감각",
};

const ORDER: CoreValueKey[] = [
  "growth",
  "trust",
  "professional",
  "sense",
];

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase 서버 환경변수가 없습니다. NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY(또는 SUPABASE_SECRET_KEY)를 설정하세요."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await context.params;
    const supabase = getSupabase();

    // 1) 직원 정보
    // 프로젝트의 실제 employees 컬럼명이 다르면 아래 select만 맞춰주세요.
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, department, position")
      .eq("id", employeeId)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "직원 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 2) 가장 최근 확정 진단 결과 1건
    const { data: result, error: resultError } = await supabase
      .from("ai_diagnosis_results")
      .select("*")
      .eq("employee_id", employeeId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (resultError) {
      console.error(resultError);
      return NextResponse.json(
        { error: "진단 결과 조회 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    if (!result) {
      return NextResponse.json(
        { error: "아직 생성된 AI 진단 결과가 없습니다." },
        { status: 404 }
      );
    }

    const rawValues = result.values_json ?? {};

    const values = ORDER.map((key) => {
      const v = rawValues[key] ?? {};
      return {
        key,
        name: LABELS[key],
        aiScore:
          typeof v.ai_score === "number"
            ? v.ai_score
            : typeof v.score === "number"
            ? v.score
            : null,
        managerScore:
          typeof v.manager_score === "number" ? v.manager_score : null,
        finalScore:
          typeof v.final_score === "number" ? v.final_score : null,
        confidence: v.confidence ?? "판단불가",
        summary: v.summary ?? "관련 진단 요약이 없습니다.",
        strengths: Array.isArray(v.strengths) ? v.strengths : [],
        evidence: Array.isArray(v.evidence) ? v.evidence : [],
        direction: v.direction ?? "",
      };
    });

    return NextResponse.json({
      employee: {
        id: employee.id,
        name: employee.name ?? "이름 미등록",
        department: employee.department ?? "부서 미등록",
        position: employee.position ?? "직책/직급 미등록",
        period: result.period_name ?? "평가기간 미등록",
      },
      overallSummary:
        result.overall_summary ?? "AI 종합 진단이 아직 작성되지 않았습니다.",
      finalGrowthDirection:
        result.final_growth_direction ?? "최종 성장 방향이 아직 설정되지 않았습니다.",
      strengthTop3: Array.isArray(result.strength_top3)
        ? result.strength_top3
        : [],
      growthTop3: Array.isArray(result.growth_top3)
        ? result.growth_top3
        : [],
      values,
      updatedAt: result.updated_at ?? null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "서버에서 진단 결과를 처리하지 못했습니다.",
      },
      { status: 500 }
    );
  }
}
