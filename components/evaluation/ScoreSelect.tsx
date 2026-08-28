export function ScoreSelect({
  name,
  defaultValue,
  required = true,
}: {
  name: string;
  defaultValue?: number | string | null;
  required?: boolean;
}) {
  return (
    <select
      name={name}
      required={required}
      defaultValue={defaultValue == null ? '' : String(defaultValue)}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
    >
      <option value="">점수</option>
      <option value="1">1 - 기대수준 크게 미달</option>
      <option value="2">2 - 일부 미달</option>
      <option value="3">3 - 현재 직급 기대수준 안정적 충족</option>
      <option value="4">4 - 기대수준 초과</option>
      <option value="5">5 - 탁월한 수준</option>
    </select>
  );
}
