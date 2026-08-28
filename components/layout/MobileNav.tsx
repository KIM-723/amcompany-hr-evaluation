'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { getNavigationForRoles } from '@/lib/permissions/route-access';
import type { Role } from '@/types';

export function MobileNav({ roles }: { roles: Role[] }) {
  const [open, setOpen] = useState(false);
  const items = getNavigationForRoles(roles);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-200 p-2 lg:hidden"
        aria-label="메뉴 열기"
      >
        <Menu size={18} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="메뉴 닫기"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-72 overflow-y-auto bg-navy-950 p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-black">AMCOMPANY</div>
                <div className="text-xs text-slate-300">인사진단 시스템</div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2"><X size={18}/></button>
            </div>
            <nav className="mt-7 space-y-2">
              {items.map((item) => (
                <div key={item.href}>
                  <Link onClick={()=>setOpen(false)} href={item.href} className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/10">
                    {item.label}
                  </Link>
                  {item.children?.length ? (
                    <div className="ml-3 border-l border-white/10 pl-3">
                      {item.children.map((child) => (
                        <Link key={child.href} onClick={()=>setOpen(false)} href={child.href} className="block px-3 py-2 text-xs text-slate-300">
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
