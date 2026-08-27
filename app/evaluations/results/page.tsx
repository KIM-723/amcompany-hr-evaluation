import { FeaturePlaceholder } from '@/components/ui/FeaturePlaceholder';

export default function EvaluationResultsPage() {
  return (
    <FeaturePlaceholder
      title="평가결과"
      description="개인별 종합진단과 성과·역량·태도·핵심가치, 강점과 성장 필요영역을 확인합니다."
      step="STEP 12 예정"
      plannedFeatures={[
        '종합진단',
        '성과·역량·태도 결과',
        '핵심가치 Radar Chart',
        '강점 TOP3',
        '성장 필요 TOP3',
        '평가자 코멘트',
        '연결된 실제 관찰사례',
      ]}
    />
  );
}
