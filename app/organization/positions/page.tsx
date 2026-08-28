import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { createPosition, setPositionActive } from '@/app/organization/actions';
import { requireHrAdmin } from '@/lib/hr/admin';
import { stringParam } from '@/lib/hr/utils';

type S = Promise<Record<string,string|string[]|undefined>>;

const roleLabel: Record<string,string> = {
  none: '일반',
  leader: '1차평가 리더',
  division_head: '리더 1차평가 본부장',
  executive: '2차평가 임원',
};

export default async function Page({searchParams}:{searchParams:S}) {
  const sp=await searchParams;
  const {supabase}=await requireHrAdmin();

  const {data}=await supabase
    .from('positions')
    .select('id,name,code,sort_order,description,is_active,evaluation_role')
    .order('sort_order')
    .order('name');

  const rows=(data??[]) as {
    id:string;name:string;code:string|null;sort_order:number;
    description:string|null;is_active:boolean;evaluation_role:string;
  }[];

  return (
    <PageShell
      title="직책관리"
      description="직책별 평가자 역할을 지정합니다. 1차평가자는 리더, 2차평가자는 임원으로 구분합니다."
    >
      <Notice success={stringParam(sp.success)} error={stringParam(sp.error)}/>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <b>평가자 구분</b>을 설정하면 평가기간의 평가자 선택목록에 자동 반영됩니다.
        리더 직책은 1차평가자, 임원 직책은 2차평가자로만 표시됩니다.
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">순서</th>
                <th className="px-4 py-3">직책</th>
                <th className="px-4 py-3">코드</th>
                <th className="px-4 py-3">평가자 구분</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x)=>{
                const action=setPositionActive.bind(null,x.id,!x.is_active);
                return (
                  <tr key={x.id} className="border-t">
                    <td className="px-4 py-3">{x.sort_order}</td>
                    <td className="px-4 py-3 font-semibold">{x.name}</td>
                    <td className="px-4 py-3">{x.code??'-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        x.evaluation_role==='leader'
                          ? 'bg-blue-50 text-blue-700'
                          : x.evaluation_role==='division_head'
                            ? 'bg-indigo-50 text-indigo-700'
                            : x.evaluation_role==='executive'
                            ? 'bg-violet-50 text-violet-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {roleLabel[x.evaluation_role] ?? '일반'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{x.is_active?'활성':'비활성'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/organization/positions/${x.id}`} className="rounded-lg border px-3 py-1.5 text-xs">수정</Link>
                        <form action={action}>
                          <button className="rounded-lg border px-3 py-1.5 text-xs">{x.is_active?'비활성화':'활성화'}</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card>
          <h2 className="font-bold">새 직책</h2>
          <form action={createPosition} className="mt-4 space-y-3">
            <label className="block text-sm">직책명 *<input name="name" required className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
            <label className="block text-sm">코드<input name="code" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
            <label className="block text-sm">평가자 구분
              <select name="evaluation_role" defaultValue="none" className="mt-1 w-full rounded-xl border px-3 py-2.5">
                <option value="none">일반</option>
                <option value="leader">1차평가 리더</option>
                <option value="division_head">리더 1차평가 본부장</option>
                <option value="executive">2차평가 임원</option>
              </select>
            </label>
            <label className="block text-sm">순서<input name="sort_order" type="number" defaultValue={rows.length+1} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
            <label className="block text-sm">설명<textarea name="description" rows={3} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
            <button className="w-full rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">직책 등록</button>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}
