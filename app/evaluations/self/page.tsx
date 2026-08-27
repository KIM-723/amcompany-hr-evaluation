import { FeaturePlaceholder } from '@/components/ui/FeaturePlaceholder';

export default function SelfEvaluationPage() {
  return (
    <FeaturePlaceholder
      title="자기평가"
      description="구성원이 자신의 주요 성과와 성장, 개선영역, 필요한 지원을 기록하는 화면입니다."
      step="STEP 9 예정"
      plannedFeatures={[
        '주요 성과',
        '가장 성장한 부분',
        '부족했던 부분',
        '다음 기간 개선영역',
        '회사 또는 리더에게 필요한 지원',
        '성과·역량·핵심가치 자기평가',
        '임시저장 및 제출',
      ]}
    />
  );
}
