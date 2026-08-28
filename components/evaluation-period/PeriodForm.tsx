type PeriodDefaults = {
  name?: string | null;
  code?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  self_start_date?: string | null;
  self_end_date?: string | null;
  first_start_date?: string | null;
  first_end_date?: string | null;
  second_start_date?: string | null;
  second_end_date?: string | null;
  calibration_start_date?: string | null;
  calibration_end_date?: string | null;
  result_release_date?: string | null;
};

function DateField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        type="date"
        name={name}
        defaultValue={defaultValue ?? ''}
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
      />
    </label>
  );
}

export function PeriodForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: PeriodDefaults;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          평가기간명 *
          <input
            name="name"
            required
            defaultValue={defaults.name ?? ''}
            placeholder="예: 2026 하반기"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          관리코드
          <input
            name="code"
            defaultValue={defaults.code ?? ''}
            placeholder="예: 2026-H2"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        설명
        <textarea
          name="description"
          rows={3}
          defaultValue={defaults.description ?? ''}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
          placeholder="평가 목적, 대상, 운영상 유의사항 등을 기록합니다."
        />
      </label>

      <div>
        <h3 className="mb-3 font-bold text-slate-900">전체 평가기간</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <DateField label="시작일 *" name="start_date" defaultValue={defaults.start_date} />
          <DateField label="종료일 *" name="end_date" defaultValue={defaults.end_date} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-3 font-bold">자기평가</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <DateField label="시작일" name="self_start_date" defaultValue={defaults.self_start_date} />
            <DateField label="종료일" name="self_end_date" defaultValue={defaults.self_end_date} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-3 font-bold">1차 평가</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <DateField label="시작일" name="first_start_date" defaultValue={defaults.first_start_date} />
            <DateField label="종료일" name="first_end_date" defaultValue={defaults.first_end_date} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-3 font-bold">2차 평가</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <DateField label="시작일" name="second_start_date" defaultValue={defaults.second_start_date} />
            <DateField label="종료일" name="second_end_date" defaultValue={defaults.second_end_date} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-3 font-bold">Calibration</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <DateField label="시작일" name="calibration_start_date" defaultValue={defaults.calibration_start_date} />
            <DateField label="종료일" name="calibration_end_date" defaultValue={defaults.calibration_end_date} />
          </div>
        </div>
      </div>

      <div className="max-w-md">
        <DateField label="결과 공개일" name="result_release_date" defaultValue={defaults.result_release_date} />
      </div>

      <div className="flex justify-end">
        <button className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
