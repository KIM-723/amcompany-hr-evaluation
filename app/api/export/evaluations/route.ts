import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getEvaluationAccess } from '@/lib/evaluation/access';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { supabase, user } = await getEvaluationAccess();

  if (!user.roles.some((r) => ['leader','hr_admin','super_admin'].includes(r))) {
    return NextResponse.json({ error: '다운로드 권한이 없습니다.' }, { status: 403 });
  }

  const periodId = request.nextUrl.searchParams.get('period');
  const departmentId = request.nextUrl.searchParams.get('department');

  let assignmentQuery = supabase.from('evaluation_assignments').select('id,period_id,employee_id,first_evaluator_id,second_evaluator_id,status');
  if (periodId) assignmentQuery = assignmentQuery.eq('period_id', periodId);
  const { data: assignments } = await assignmentQuery;
  const employeeIds = [...new Set((assignments ?? []).flatMap((a:any)=>[a.employee_id,a.first_evaluator_id,a.second_evaluator_id].filter(Boolean)))];

  let employeeQuery = supabase.from('employees').select('id,employee_no,name,department_id,job_level_id,position_id');
  if (employeeIds.length) employeeQuery = employeeQuery.in('id', employeeIds);
  if (departmentId) employeeQuery = employeeQuery.eq('department_id', departmentId);
  const [{data:employees},{data:departments},{data:jobLevels},{data:positions},{data:periods},{data:results},{data:growth},{data:responses}] = await Promise.all([
    employeeQuery,
    supabase.from('departments').select('id,name'),
    supabase.from('job_levels').select('id,name'),
    supabase.from('positions').select('id,name'),
    supabase.from('evaluation_periods').select('id,name'),
    supabase.from('evaluation_results').select('*'),
    supabase.from('growth_plans').select('*'),
    supabase.from('evaluation_responses').select('evaluation_id,question_id,score,comment'),
  ]);

  const em=new Map<string, any>((employees??[]).map((x:any)=>[x.id,x])); const dm=new Map<string, string>((departments??[]).map((x:any)=>[x.id,x.name]));const jm=new Map<string, string>((jobLevels??[]).map((x:any)=>[x.id,x.name]));const pom=new Map<string, string>((positions??[]).map((x:any)=>[x.id,x.name]));const pm=new Map<string, string>((periods??[]).map((x:any)=>[x.id,x.name])); const rm=new Map<string, any>((results??[]).map((x:any)=>[x.assignment_id,x]));

  const summary=(assignments??[]).filter((a:any)=>em.has(a.employee_id)).map((a:any)=>{const e=em.get(a.employee_id);const r=rm.get(a.id);return {
    평가기간:pm.get(a.period_id)??'',사번:e.employee_no,이름:e.name,부서:dm.get(e.department_id)??'',직급:jm.get(e.job_level_id)??'',직책:pom.get(e.position_id)??'',
    '1차 평가자':em.get(a.first_evaluator_id)?.name??'','2차 평가자':em.get(a.second_evaluator_id)?.name??'',성과:r?.performance_score??'',역량:r?.competency_score??'',태도:r?.attitude_score??'',
    성장:r?.core_value_scores?.['성장']??'',신뢰:r?.core_value_scores?.['신뢰']??'',전문성:r?.core_value_scores?.['전문성']??'',감각:r?.core_value_scores?.['감각']??'',종합점수:r?.total_score??'',상태:a.status
  }});

  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(summary),'개인별 종합결과');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(responses??[]),'평가항목별 결과');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((results??[]).map((r:any)=>({assignment_id:r.assignment_id,...r.core_value_scores}))),'핵심가치');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((results??[]).map((r:any)=>({assignment_id:r.assignment_id,performance_score:r.performance_score,competency_score:r.competency_score}))),'9-Block');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(growth??[]),'성장계획');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((assignments??[]).map((a:any)=>({평가기간:pm.get(a.period_id),직원:em.get(a.employee_id)?.name,status:a.status}))),'평가 진행현황');

  const buffer=XLSX.write(wb,{type:'buffer',bookType:'xlsx'});
  return new NextResponse(buffer,{
    headers:{
      'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':`attachment; filename="AMCOMPANY_HR_Evaluation.xlsx"`,
      'Cache-Control':'no-store',
    },
  });
}
