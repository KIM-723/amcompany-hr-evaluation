'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardCheck, NotebookPen, Users, Network, CalendarDays, ListChecks, SlidersHorizontal, Grid3X3, BarChart3, Settings, TrendingUp } from 'lucide-react';
const menus=[
['/dashboard','Dashboard',LayoutDashboard],['/evaluations','인사진단',ClipboardCheck],['/observations','관찰일지',NotebookPen],['/employees','직원관리',Users],['/organization','조직관리',Network],['/periods','평가기간',CalendarDays],['/questions','평가문항',ListChecks],['/calibration','Calibration',SlidersHorizontal],['/nine-block','9-Block',Grid3X3],['/growth-plans','성장계획',TrendingUp],['/stats','통계',BarChart3],['/settings','설정',Settings]
] as const;
export function Sidebar(){const p=usePathname();return <aside className="fixed inset-y-0 left-0 w-64 bg-navy-950 px-4 py-6 text-white"><div className="px-3"><div className="text-xl font-black tracking-tight">AMCOMPANY</div><div className="mt-1 text-xs text-slate-300">인사진단 시스템</div></div><nav className="mt-8 space-y-1">{menus.map(([href,label,Icon])=><Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${p===href?'bg-white/15 font-semibold':'text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon size={18}/>{label}</Link>)}</nav></aside>}
