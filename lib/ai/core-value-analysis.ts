export const CORE_VALUE_PROMPT_VERSION = 'amcompany-core-values-2026-09-v1';

export type CoreValueKey =
  | 'growth'
  | 'trust'
  | 'professionalism'
  | 'sense';

export type CoreValueResult = {
  status: 'scored' | 'insufficient_evidence';
  score: number | null;
  confidence: 'low' | 'medium' | 'high';
  evidence: string[];
  rationale: string;
  growth_action: string;
};

export type CoreValueAIResult = {
  values: Record<CoreValueKey, CoreValueResult>;
  strengths: string[];
  growth_areas: string[];
  overall_summary: string;
  recommended_actions: string[];
};

export type DiagnosisAnalysisSource = {
  diagnosis_id: string;
  department: string;
  job_level: string;
  position: string;
  diagnosis_summary: unknown;
  growth_points: unknown;
  growth_directions: unknown;
  other_comment: string | null;
};

const valueResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'status',
    'score',
    'confidence',
    'evidence',
    'rationale',
    'growth_action',
  ],
  properties: {
    status: {
      type: 'string',
      enum: ['scored', 'insufficient_evidence'],
    },
    score: {
      type: ['integer', 'null'],
      minimum: 0,
      maximum: 100,
    },
    confidence: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
    },
    evidence: {
      type: 'array',
      items: { type: 'string' },
    },
    rationale: { type: 'string' },
    growth_action: { type: 'string' },
  },
} as const;

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'values',
    'strengths',
    'growth_areas',
    'overall_summary',
    'recommended_actions',
  ],
  properties: {
    values: {
      type: 'object',
      additionalProperties: false,
      required: ['growth', 'trust', 'professionalism', 'sense'],
      properties: {
        growth: valueResultSchema,
        trust: valueResultSchema,
        professionalism: valueResultSchema,
        sense: valueResultSchema,
      },
    },
    strengths: {
      type: 'array',
      items: { type: 'string' },
    },
    growth_areas: {
      type: 'array',
      items: { type: 'string' },
    },
    overall_summary: { type: 'string' },
    recommended_actions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const;

const SYSTEM_PROMPT = `
당신은 AMCOMPANY의 구성원 성장 지원을 위한 조직개발 분석가다.

목적:
최종 인사진단의 업무 관찰 근거만 사용하여 AMCOMPANY 핵심가치
'성장, 신뢰, 전문성, 감각'과의 행동 Alignment를 분석한다.

중요 원칙:
1. 이 결과는 육성·피드백을 위한 보조자료다.
2. 보상, 승진, 배치, 징계, 해고 등 고용 의사결정을 자동으로 추천하지 않는다.
3. 성별, 나이, 출신, 국적, 종교, 건강, 장애, 가족관계 등 민감한 개인특성을
   추론하거나 점수에 사용하지 않는다.
4. 입력에 없는 행동이나 사실을 절대 만들어내지 않는다.
5. 표현의 호감도보다 구체적인 업무 행동과 근거를 우선한다.
6. 근거가 부족하면 억지로 정밀한 점수를 만들지 말고
   status="insufficient_evidence", score=null로 반환한다.
7. evidence는 입력 내용을 짧게 요약한 근거이며 원문에 없는 내용을 추가하지 않는다.

AMCOMPANY 핵심가치 행동기준:

[성장]
- 새로운 시도와 학습
- 피드백 수용 및 행동 변화
- 반복적인 개선
- 이전 대비 발전
- 실패나 문제를 학습으로 전환

[신뢰]
- 약속과 기준 준수
- 책임감과 일관성
- 필요한 정보의 적시 공유
- 책임 회피보다 문제 해결
- 동료·부서와의 투명하고 안정적인 협업

[전문성]
- 업무 정확도와 품질
- 직무 이해도
- 문제 원인 분석과 해결
- 재발 방지
- 주도적인 실행과 결과 완성도

[감각]
- 고객/시장/상황에 대한 맥락 이해
- 우선순위 판단
- 적절한 타이밍과 의사결정
- 디테일과 완성도
- 변화에 대한 빠르고 현실적인 대응

점수 기준:
90~100 = 반복적으로 매우 높은 수준의 Alignment가 구체적 근거로 확인됨
75~89  = 대부분의 상황에서 안정적으로 Alignment된 행동이 확인됨
60~74  = 기본 기대수준은 확인되나 일관성 또는 확장성이 부족함
40~59  = 일부 긍정 행동은 있으나 개선이 필요한 상충 행동이 함께 확인됨
0~39   = 핵심가치와 상충하는 행동이 반복적이고 명확한 근거로 확인됨

주의:
근거 부족은 낮은 점수의 근거가 아니다.
근거가 부족하면 반드시 insufficient_evidence를 사용한다.

출력:
- 핵심가치별 점수 또는 근거부족
- confidence
- 판단근거
- 판단 이유
- 한 가지 구체적인 성장행동
- 전체 강점
- 우선 성장영역
- 전체 요약
- 실행 가능한 추천행동
`.trim();

function extractOutputText(data: any) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  for (const item of data?.output ?? []) {
    if (item?.type !== 'message') continue;

    for (const content of item?.content ?? []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') {
        return content.text.trim();
      }
    }
  }

  return '';
}

function normalizeScore(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeValue(value: any): CoreValueResult {
  const status =
    value?.status === 'insufficient_evidence'
      ? 'insufficient_evidence'
      : 'scored';

  const score =
    status === 'insufficient_evidence'
      ? null
      : normalizeScore(value?.score);

  return {
    status: score === null ? 'insufficient_evidence' : 'scored',
    score,
    confidence:
      value?.confidence === 'high'
        ? 'high'
        : value?.confidence === 'medium'
          ? 'medium'
          : 'low',
    evidence: Array.isArray(value?.evidence)
      ? value.evidence.filter((item: unknown) => typeof item === 'string').slice(0, 6)
      : [],
    rationale:
      typeof value?.rationale === 'string'
        ? value.rationale.trim()
        : '',
    growth_action:
      typeof value?.growth_action === 'string'
        ? value.growth_action.trim()
        : '',
  };
}

export function normalizeAIResult(value: any): CoreValueAIResult {
  return {
    values: {
      growth: normalizeValue(value?.values?.growth),
      trust: normalizeValue(value?.values?.trust),
      professionalism: normalizeValue(value?.values?.professionalism),
      sense: normalizeValue(value?.values?.sense),
    },
    strengths: Array.isArray(value?.strengths)
      ? value.strengths.filter((item: unknown) => typeof item === 'string').slice(0, 5)
      : [],
    growth_areas: Array.isArray(value?.growth_areas)
      ? value.growth_areas.filter((item: unknown) => typeof item === 'string').slice(0, 5)
      : [],
    overall_summary:
      typeof value?.overall_summary === 'string'
        ? value.overall_summary.trim()
        : '',
    recommended_actions: Array.isArray(value?.recommended_actions)
      ? value.recommended_actions
          .filter((item: unknown) => typeof item === 'string')
          .slice(0, 5)
      : [],
  };
}

export function calculateOverallScore(result: CoreValueAIResult) {
  const scores = [
    result.values.growth.score,
    result.values.trust.score,
    result.values.professionalism.score,
    result.values.sense.score,
  ].filter((score): score is number => typeof score === 'number');

  if (scores.length < 2) return null;

  return Math.round(
    scores.reduce((sum, score) => sum + score, 0) / scores.length,
  );
}

export function alignmentLevel(score: number | null) {
  if (score === null) return '근거 부족';
  if (score >= 90) return '매우 높은 Alignment';
  if (score >= 75) return '안정적 Alignment';
  if (score >= 60) return '기본 Alignment';
  if (score >= 40) return '성장 필요';
  return '집중 성장 필요';
}

export async function analyzeCoreValues(
  source: DiagnosisAnalysisSource,
): Promise<{
  result: CoreValueAIResult;
  model: string;
  responseId: string | null;
}> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Vercel 환경변수 OPENAI_API_KEY가 설정되어 있지 않습니다.',
    );
  }

  const model = process.env.OPENAI_MODEL || 'gpt-5.6-terra';
  const baseUrl = (
    process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  ).replace(/\/$/, '');

  const userInput = {
    직무_맥락: {
      부서: source.department || '미지정',
      직무레벨: source.job_level || '미지정',
      직책: source.position || '미지정',
    },
    최종_진단: {
      진단_요약: source.diagnosis_summary,
      성장_포인트: source.growth_points,
      본부장_성장_방향: source.growth_directions,
      기타_코멘트: source.other_comment,
    },
  };

  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      store: false,
      reasoning: {
        effort: process.env.OPENAI_REASONING_EFFORT || 'medium',
      },
      instructions: SYSTEM_PROMPT,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify(userInput),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'amcompany_core_value_alignment',
          description:
            'AMCOMPANY 성장·신뢰·전문성·감각 Alignment 분석 결과',
          strict: true,
          schema: responseSchema,
        },
      },
    }),
    cache: 'no-store',
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `OpenAI API 오류 (${response.status})`;

    throw new Error(message);
  }

  const outputText = extractOutputText(data);

  if (!outputText) {
    throw new Error('AI 분석 결과 본문을 받지 못했습니다.');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error('AI 분석 결과 JSON을 해석하지 못했습니다.');
  }

  return {
    result: normalizeAIResult(parsed),
    model: data?.model || model,
    responseId: typeof data?.id === 'string' ? data.id : null,
  };
}
