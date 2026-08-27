'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Grid3X3,
  LayoutDashboard,
  ListChecks,
  Network,
  NotebookPen,
  Settings,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from 'lucide-react';
import { NAVIGATION_ITEMS, type NavigationIconKey } from '@/config/navigation';

const iconMap = {
  dashboard: LayoutDashboard,
  evaluation: ClipboardCheck,
  observation: NotebookPen,
  employee: Users,
  organization: Network,
  period: CalendarDays,
  question: ListChecks,
  calibration: SlidersHorizontal,
  nineBlock: Grid3X3,
  growth: TrendingUp,
  stats: BarChart3,
  settings: Settings,
} satisfies Record<NavigationIconKey, typeof LayoutDashboard>;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 overflow-y-auto bg-navy-950 px-4 py-6 text-white">
      <div className="px-3">
        <div className="text-xl font-black tracking-tight">AMCOMPANY</div>
        <div className="mt-1 text-xs text-slate-300">인사진단 시스템</div>
      </div>

      <nav className="mt-8 space-y-1">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = iconMap[item.icon];
          const active = isActive(pathname, item.href);

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? 'bg-white/15 font-semibold text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>

              {active && item.children?.length ? (
                <div className="ml-8 mt-1 space-y-1 border-l border-white/10 pl-3">
                  {item.children.map((child) => {
                    const childActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block rounded-lg px-3 py-2 text-xs transition ${
                          childActive
                            ? 'bg-white/10 font-semibold text-white'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] leading-5 text-slate-300">
        STEP 1에서는 전체 IA를 표시합니다. Role별 실제 메뉴 필터링과 접근 차단은 STEP 4에서 적용합니다.
      </div>
    </aside>
  );
}
