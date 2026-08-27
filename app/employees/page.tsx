import { DataTable, PageShell, Toolbar } from '@/components/ui/PageShell';
const rows=[['AM001','럭케이','국내섬유영업','마스터','사업부대표','재직'],['AM002','진','경영지원','베테랑','리더','재직'],['AM003','루카','니트생산관리','시니어','리더','재직'],['AM004','케네스','우븐생산관리','시니어','리더','재직'],['AM005','챔프','품질검사물류','시니어','리더','재직'],['AM006','준','패션디자인','시니어','리더','재직']];
export default function Page(){return <PageShell title="직원관리" description="구성원 기본정보, 조직, 직급, 직책과 재직상태를 관리합니다."><Toolbar/><DataTable headers={['사번','이름','부서','직급','직책','상태']} rows={rows}/></PageShell>}
