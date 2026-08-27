import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { updateDepartment } from '@/app/organization/actions';
import { requireHrAdmin } from '@/lib/hr/admin';
import { stringParam } from '@/lib/hr/utils';

type PageParams = Promise<{ id:string }>;
type SearchParams = Promise<Record<string,string|string[]|undefined>>;

export default async function DepartmentEditPage({ params, searchParams }: { params:PageParams; searchParams:SearchParams }) {
  const { id } = await params; const sp = await searchParams; const { supabase } = await requireHrAdmin();
  const [{ data: dept }, { data: departments }] = await Promise.all([
    supabase.from('departments').select('id,name,code,parent_id,sort_order,is_active,description').eq('id',id).maybeSingle(),
    supabase.from('departments').select('id,name,is_active').order('sort_order').order('name'),
  ]);
  if (!dept) notFound();
  const departmentOptions = (departments ?? []) as { id: string; name: string; is_active: boolean }[];
  const action = updateDepartment.bind(null,id);
  return <PageShell title={`부서 수정 · ${dept.name}`} description="부서명, 코드, 상위부서와 표시순서를 수정합니다.">
    <Notice success={stringParam(sp.success)} error={stringParam(sp.error)}/>
    <Card><form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">부서명 *<input name="name" required defaultValue={dept.name} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label><label className="text-sm font-medium">부서코드<input name="code" defaultValue={dept.code??''} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label><label className="text-sm font-medium">상위부서<select name="parent_id" defaultValue={dept.parent_id??''} className="mt-1 w-full rounded-xl border px-3 py-2.5"><option value="">없음 (최상위)</option>{departmentOptions.filter((x)=>x.id!==id).map((d)=><option key={d.id} value={d.id}>{d.name}{d.is_active?'':' (비활성)'}</option>)}</select></label><label className="text-sm font-medium">정렬순서<input type="number" name="sort_order" defaultValue={dept.sort_order} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label></div>
      <label className="block text-sm font-medium">설명<textarea name="description" defaultValue={dept.description??''} rows={4} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
      <div className="flex justify-end gap-2 border-t pt-4"><Link href="/organization" className="rounded-xl border px-4 py-2 text-sm">목록</Link><button className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white">저장</button></div>
    </form></Card>
  </PageShell>;
}
