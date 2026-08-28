export function ResignedBadge({
  status,
  resignationDate,
}: {
  status?: string | null;
  resignationDate?: string | null;
}) {
  if (status !== 'resigned') return null;

  return (
    <span className="inline-flex rounded-full bg-slate-800 px-2 py-1 text-[11px] font-bold text-white">
      퇴사자{resignationDate ? ` · ${resignationDate}` : ''}
    </span>
  );
}
