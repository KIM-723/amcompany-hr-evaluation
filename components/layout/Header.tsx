import { CORE_VALUES } from '@/config/system';
import { ROLE_LABELS } from '@/lib/auth/roles';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { MobileNav } from '@/components/layout/MobileNav';
import type { CurrentUserContext } from '@/types/auth';

export function Header({ user }: { user: CurrentUserContext }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 lg:px-8">
      <div className="flex items-center gap-3">
        <MobileNav roles={user.roles} />
        <div>
          <div className="text-sm font-semibold text-slate-900">AMCOMPANY 인사진단</div>
          <div className="hidden text-xs text-slate-500 sm:block">{CORE_VALUES.join(' · ')}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 lg:gap-3">
        <div className="hidden text-right sm:block">
          <div className="text-xs font-bold text-slate-800">{user.name}</div>
          <div className="text-[11px] text-slate-400">
            {[user.departmentName, user.employeeNo].filter(Boolean).join(' · ')}
          </div>
        </div>
        {user.primaryRole ? (
          <span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 md:inline-flex">
            {ROLE_LABELS[user.primaryRole]}
          </span>
        ) : null}
        <LogoutButton />
      </div>
    </header>
  );
}
