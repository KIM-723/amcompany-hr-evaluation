import { DataTable, PageShell, Toolbar } from '@/components/ui/PageShell';
const rows=[['성과','목표 달성도','업무 목표를 계획한 수준으로 달성했는가?','성장','25%','활성'],['역량','문제해결','문제를 구조화하고 적절한 대안을 실행하는가?','전문성','20%','활성'],['태도 & 습관','협업 신뢰','약속과 기준을 지키며 동료와 협업하는가?','신뢰','15%','활성'],['역량','고객 감각','고객·시장 변화에서 중요한 신호를 포착하는가?','감각','15%','활성']];
export default function Page(){return <PageShell title="평가문항" description="평가영역, 문항, 핵심가치, 직급별 행동기준과 가중치를 관리합니다."><Toolbar/><DataTable headers={['영역','문항명','질문','핵심가치','가중치','상태']} rows={rows}/></PageShell>}
