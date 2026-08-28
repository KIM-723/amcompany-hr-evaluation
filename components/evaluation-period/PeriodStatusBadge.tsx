const STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: '초안', className: 'bg-slate-100 text-slate-700' },
  scheduled: { label: '예정', className: 'bg-blue-50 text-blue-700' },
  active: { label: '진행중', className: 'bg-emerald-50 text-emerald-700' },
  calibration: { label: 'Calibration', className: 'bg-amber-50 text-amber-700' },
  closed: { label: '종료', className: 'bg-slate-800 text-white' },
};

export function PeriodStatusBadge({ status }: { status: string }) {
  const item = STATUS[status] ?? { label: status, className: 'bg-slate-100 text-slate-700' };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.className}`}>
      {item.label}
    </span>
  );
}
