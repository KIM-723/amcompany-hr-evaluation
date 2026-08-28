import {notFound} from 'next/navigation';
import {PageShell} from '@/components/ui/PageShell';
import {Card} from '@/components/ui/Card';
import {Notice} from '@/components/hr/Notice';
import {getEvaluationAccess} from '@/lib/evaluation/access';
import {stringParam} from '@/lib/hr/utils';
import {updateObservation} from '../actions';

type Props={params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>};

export default async function ObservationEdit({params,searchParams}:Props){
 const {id}=await params;const sp=await searchParams;const {supabase}=await getEvaluationAccess();
 const [{data:log},{data:coreValues},{data:questions}]=await Promise.all([
  supabase.from('observation_logs').select('*').eq('id',id).single(),
  supabase.from('core_values').select('id,name').eq('is_active',true).order('sort_order'),
  supabase.from('evaluation_questions').select('id,title').eq('is_active',true).order('sort_order')
 ]);
 if(!log)notFound();
 return <PageShell title="관찰일지 수정" description="SBI 근거를 수정합니다."><Notice error={stringParam(sp.error)}/><Card><form action={updateObservation.bind(null,id)} className="space-y-4">
  <div className="grid gap-3 md:grid-cols-2"><label className="text-sm">날짜<input name="observed_date" type="date" defaultValue={log.observed_date} className="mt-1 w-full rounded-lg border px-3 py-2"/></label><label className="text-sm">유형<select name="sentiment" defaultValue={log.sentiment} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="positive">긍정</option><option value="improvement">개선 필요</option></select></label></div>
  <input name="related_work" defaultValue={log.related_work??''} placeholder="관련 업무" className="w-full rounded-lg border px-3 py-2"/>
  <textarea name="situation" required defaultValue={log.situation} className="w-full rounded-lg border px-3 py-2" placeholder="Situation"/>
  <textarea name="behavior" required defaultValue={log.behavior} className="w-full rounded-lg border px-3 py-2" placeholder="Behavior"/>
  <textarea name="impact_result" required defaultValue={log.impact_result} className="w-full rounded-lg border px-3 py-2" placeholder="Impact / Result"/>
  <div className="grid gap-3 md:grid-cols-2"><select name="core_value_id" defaultValue={log.core_value_id??''} className="rounded-lg border px-3 py-2"><option value="">핵심가치 미지정</option>{(coreValues??[]).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><select name="question_id" defaultValue={log.question_id??''} className="rounded-lg border px-3 py-2"><option value="">문항 미지정</option>{(questions??[]).map(q=><option key={q.id} value={q.id}>{q.title}</option>)}</select></div>
  <div className="flex justify-end"><button className="rounded-lg bg-navy-900 px-4 py-2 font-semibold text-white">수정 저장</button></div>
 </form></Card></PageShell>
}
