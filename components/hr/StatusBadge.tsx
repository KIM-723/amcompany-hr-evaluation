const labels: Record<string, string> = {
  active: '재직',
  leave: '휴직',
  resigned: '퇴사',
};

export function EmployeeStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'active'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'leave'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {labels[status] ?? status}
    </span>
  );
}
