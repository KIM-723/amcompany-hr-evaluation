import { FeaturePlaceholder } from '@/components/ui/FeaturePlaceholder';

export default function JobLevelsPage() {
  return (
    <FeaturePlaceholder
      title="직급관리"
      description="직급을 하드코딩하지 않고 관리자가 추가·수정·정렬·비활성화할 수 있도록 설계된 관리 화면입니다."
      step="STEP 5 예정"
      backHref="/organization"
      plannedFeatures={[
        '직급 목록',
        '직급 추가',
        '직급명 수정',
        '표시 순서 변경',
        '비활성화',
        '평가문항 적용 기준 연결',
      ]}
    />
  );
}
