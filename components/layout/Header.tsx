import { CORE_VALUES } from '@/config/system';
import { ROLE_LABELS } from '@/lib/auth/roles';
import { LogoutButton } from '@/components/auth/LogoutButton';
import type { CurrentUserContext } from '@/types/auth';

export function Header({ user }: { user: CurrentUserContext }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-8">
      <div>
        <div className="text-sm font-semibold text-slate-900">AMCOMPANY 인사진단</div>
        <div className="text-xs text-slate-500">{CORE_VALUES.join(' · ')}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs font-bold text-slate-800">{user.name}</div>
          <div className="text-[11px] text-slate-400">
            {[user.departmentName, user.employeeNo].filter(Boolean).join(' · ')}
          </div>
        </div>
        {user.primaryRole ? (
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            {ROLE_LABELS[user.primaryRole]}
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">Role 미지정</span>
        )}
        <LogoutButton />
      </div>
    </header>
  );
}
