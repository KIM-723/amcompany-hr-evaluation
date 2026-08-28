import Link from 'next/link';

type Option = { id: string; name: string };
type EmployeeOption = { id: string; employee_no: string; name: string };

type EmployeeValue = {
  employee_no?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  hire_date?: string;
  resignation_date?: string | null;
  employment_status?: string;
  employment_type?: string;
  department_id?: string | null;
  job_level_id?: string | null;
  position_id?: string | null;
  leader_id?: string | null;
  is_leader?: boolean;
  notes?: string | null;
};

export function EmployeeForm({
  action,
  value = {},
  departments,
  jobLevels,
  positions,
  leaders,
  submitLabel,
  cancelHref = '/employees',
}: {
  action: (formData: FormData) => void | Promise<void>;
  value?: EmployeeValue;
  departments: Option[];
  jobLevels: Option[];
  positions: Option[];
  leaders: EmployeeOption[];
  submitLabel: string;
  cancelHref?: string;
}) {
  const input = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500';
  const label = 'text-sm font-medium text-slate-700';

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <label className={label}>사번 *<input name="employee_no" defaultValue={value.employee_no ?? ''} className={input} required /></label>
        <label className={label}>이름 *<input name="name" defaultValue={value.name ?? ''} className={input} required /></label>
        <label className={label}>이메일<input type="email" name="email" defaultValue={value.email ?? ''} className={input} /></label>
        <label className={label}>전화번호<input name="phone" defaultValue={value.phone ?? ''} className={input} /></label>
        <label className={label}>입사일 *<input type="date" name="hire_date" defaultValue={value.hire_date ?? ''} className={input} required /></label>
        <label className={label}>퇴사일
          <input type="date" name="resignation_date" defaultValue={value.resignation_date ?? ''} className={input} />
          <span className="mt-1 block text-xs font-normal text-slate-400">재직상태가 '퇴사'일 때 필수입니다.</span>
        </label>

        <label className={label}>고용형태 *
          <select name="employment_type" defaultValue={value.employment_type ?? 'regular'} className={input}>
            <option value="regular">정규직</option>
            <option value="contract">계약직</option>
            <option value="part_time">파트타임</option>
            <option value="executive">임원</option>
            <option value="other">기타</option>
          </select>
        </label>

        <label className={label}>재직상태 *
          <select name="employment_status" defaultValue={value.employment_status ?? 'active'} className={input}>
            <option value="active">재직</option>
            <option value="leave">휴직</option>
            <option value="resigned">퇴사</option>
          </select>
        </label>

        <label className={label}>부서
          <select name="department_id" defaultValue={value.department_id ?? ''} className={input}>
            <option value="">미지정</option>
            {departments.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>

        <label className={label}>직급
          <select name="job_level_id" defaultValue={value.job_level_id ?? ''} className={input}>
            <option value="">미지정</option>
            {jobLevels.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>

        <label className={label}>직책
          <select name="position_id" defaultValue={value.position_id ?? ''} className={input}>
            <option value="">미지정</option>
            {positions.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>

        <label className={label}>리더
          <select name="leader_id" defaultValue={value.leader_id ?? ''} className={input}>
            <option value="">미지정</option>
            {leaders.map((x)=><option key={x.id} value={x.id}>{x.employee_no} · {x.name}</option>)}
          </select>
        </label>

        <label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          <input type="checkbox" name="is_leader" defaultChecked={value.is_leader ?? false} /> 리더 여부
        </label>
      </div>

      <label className={label}>비고<textarea name="notes" defaultValue={value.notes ?? ''} rows={4} className={input} /></label>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
        <Link href={cancelHref} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">취소</Link>
        <button className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white">{submitLabel}</button>
      </div>
    </form>
  );
}
