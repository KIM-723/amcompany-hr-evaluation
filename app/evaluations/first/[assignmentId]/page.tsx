import { notFound } from 'next/navigation';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { ScoreSelect } from '@/components/evaluation/ScoreSelect';
import { saveFirstEvaluation } from '../actions';
import { getEvaluationAccess } from '@/lib/evaluation/access';
import { stringParam } from '@/lib/hr/utils';

type Props={params:Promise<{assignmentId:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>};

export default async function FirstEvaluationDetail({params,searchParams}:Props){
  const {assignmentId}=await params; const sp=await searchParams; const {supabase}=await getEvaluationAccess();
  const {data:assignment}=await supabase.from('evaluation_assignments').select('*').eq('id',assignmentId).single();
  if(!assignment) notFound();
  const [{data:employee},{data:evaluation},{data:self},{data:questions},{data:observations}] = await Promise.all([
    supabase.from('employees').select('id,name,employee_no,job_level_id').eq('id',assignment.employee_id).single(),
    supabase.from('evaluations').select('*').eq('assignment_id',assignmentId).eq('stage','first').maybeSingle(),
    supabase.from('self_evaluations').select('*').eq('assignment_id',assignmentId).maybeSingle(),
    supabase.from('evaluation_questions').select('id,title,question,description,behavior_examples,category_id,weight').eq('template_id',assignment.template_id).eq('is_active',true).order('sort_order'),
    supabase.from('observation_logs').select('id,observed_date,situation,behavior,impact_result,question_id').eq('subject_employee_id',assignment.employee_id).eq('is_archived',false).order('observed_date',{ascending:false}),
  ]);
  if(!evaluation) return <PageShell title="1차 평가" description="먼저 목록에서 평가 시작을 눌러주세요."><Card>평가 레코드가 없습니다.</Card></PageShell>;
  const [{data:responses},{data:categories},{data:standards}] = await Promise.all([
    supabase.from('evaluation_responses').select('*').eq('evaluation_id',evaluation.id),
    supabase.from('evaluation_categories').select('id,name,sort_order').eq('template_id',assignment.template_id).order('sort_order'),
    employee?.job_level_id ? supabase.from('evaluation_question_standards').select('question_id,expected_behavior').eq('job_level_id',employee.job_level_id) : Promise.resolve({data:[] as any[]})
  ]);
  const rm=new Map<string, any>((responses??[]).map((x:any)=>[x.question_id,x])); const sm=new Map<string, string>((standards??[]).map((x:any)=>[x.question_id,x.expected_behavior]));
  const locked=evaluation.status==='submitted'||evaluation.status==='approved'||evaluation.status==='finalized';

  return <PageShell title={`1차 평가 · ${employee?.name ?? ''}`} description="3점은 현재 직급 기대수준을 안정적으로 충족한 상태입니다. 1점/5점은 근거가 필수입니다.">
    <Notice success={stringParam(sp.success)} error={stringParam(sp.error)}/>
    {self && <Card><h2 className="font-bold">자기평가 비교</h2><div className="mt-3 grid gap-3 md:grid-cols-2 text-sm"><div>성과 자기점수 <b>{self.performance_score ?? '-'}</b></div><div>역량 자기점수 <b>{self.competency_score ?? '-'}</b></div><div className="md:col-span-2">주요 성과: {self.achievements ?? '-'}</div></div></Card>}
    <form action={saveFirstEvaluation.bind(null,assignmentId)} className="space-y-5">
      <input type="hidden" name="evaluation_id" value={evaluation.id}/>
      {(categories??[]).map(cat=><div key={cat.id} className="space-y-3"><h2 className="text-lg font-bold">{cat.name}</h2>{(questions??[]).filter(q=>q.category_id===cat.id).map(q=>{const r=rm.get(q.id);const obs=(observations??[]).filter(o=>!o.question_id||o.question_id===q.id);return <Card key={q.id}>
        <input type="hidden" name="question_ids" value={q.id}/>
        <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">{q.title}</h3><p className="mt-1 text-sm text-slate-600">{q.question}</p>{sm.get(q.id)&&<p className="mt-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800"><b>현재 직급 기대수준:</b> {sm.get(q.id)}</p>}</div><ScoreSelect name={`score_${q.id}`} defaultValue={r?.score}/></div>
        <div className="mt-3 grid gap-3 md:grid-cols-2"><textarea name={`comment_${q.id}`} defaultValue={r?.comment??''} placeholder="평가 코멘트" className="rounded-lg border px-3 py-2"/><textarea name={`evidence_${q.id}`} defaultValue={r?.evidence_note??''} placeholder="평가 근거 (1점/5점 필수)" className="rounded-lg border px-3 py-2"/></div>
        <select name={`observation_${q.id}`} className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"><option value="">관찰일지 Evidence 연결 안함</option>{obs.map(o=><option key={o.id} value={o.id}>{o.observed_date} · {o.behavior.slice(0,60)}</option>)}</select>
      </Card>})}</div>)}
      <Card><div className="grid gap-3 md:grid-cols-3"><textarea name="strengths" defaultValue={evaluation.strengths??''} placeholder="잘한 점" className="rounded-lg border px-3 py-2"/><textarea name="improvements" defaultValue={evaluation.improvements??''} placeholder="개선할 점" className="rounded-lg border px-3 py-2"/><textarea name="next_expectations" defaultValue={evaluation.next_expectations??''} placeholder="다음 기간 기대" className="rounded-lg border px-3 py-2"/></div></Card>
      {!locked&&<div className="flex justify-end gap-2"><button name="intent" value="save" className="rounded-lg border px-4 py-2 font-semibold">임시저장</button><button name="intent" value="submit" className="rounded-lg bg-navy-900 px-4 py-2 font-semibold text-white">1차 평가 제출</button></div>}
    </form>
  </PageShell>
}
