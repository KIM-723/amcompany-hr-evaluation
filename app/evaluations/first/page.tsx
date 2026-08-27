import { FeaturePlaceholder } from '@/components/ui/FeaturePlaceholder';

export default function FirstEvaluationPage() {
  return (
    <FeaturePlaceholder
      title="1차 평가"
      description="1차 평가자가 직급별 기대수준과 실제 Evidence를 기준으로 성과·역량·태도·핵심가치를 평가합니다."
      step="STEP 10 예정"
      plannedFeatures={[
        '성과 평가',
        '역량 평가',
        '태도 & 습관 평가',
        '핵심가치 진단',
        '관찰일지 Evidence 연결',
        '1·5점 근거 필수 Validation',
        '종합 코멘트 및 제출',
      ]}
    />
  );
}
