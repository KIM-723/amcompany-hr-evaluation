import { FeaturePlaceholder } from '@/components/ui/FeaturePlaceholder';

export default function SecondEvaluationPage() {
  return (
    <FeaturePlaceholder
      title="2차 평가 Review"
      description="2차 평가자가 1차 평가의 근거 충분성, 점수 일관성, 관대·엄격 경향을 검토합니다."
      step="STEP 11 예정"
      plannedFeatures={[
        '1차 평가 결과 Review',
        'Evidence 충분성 확인',
        '점수와 사례 일치 여부 확인',
        '승인',
        '의견 추가',
        '재검토 요청',
        'Calibration 필요 표시',
      ]}
    />
  );
}
