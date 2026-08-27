import { FeaturePlaceholder } from '@/components/ui/FeaturePlaceholder';

export default function RolesPage() {
  return (
    <FeaturePlaceholder
      title="Role / 권한 구조"
      description="직원, 평가자, 리더, HR 관리자, 최고관리자의 접근범위를 확인하고 관리하는 화면입니다."
      step="STEP 4 예정"
      backHref="/settings"
      plannedFeatures={[
        '직원 권한',
        '1차 평가자 권한',
        '2차 평가자 권한',
        '리더 조직범위',
        'HR 관리자 권한',
        '최고관리자 권한',
        'Supabase RLS 정책 연계',
      ]}
    />
  );
}
