import { CORE_VALUES } from '@/config/system';

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-8">
      <div>
        <div className="text-sm font-semibold text-slate-900">AMCOMPANY 인사진단</div>
        <div className="text-xs text-slate-500">{CORE_VALUES.join(' · ')}</div>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
          STEP 1 · IA
        </span>
        <span className="text-xs text-slate-500">권한 연결 전</span>
      </div>
    </header>
  );
}
