import Link from 'next/link';
import { ArrowRight, Database, LockKeyhole, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface FeaturePlaceholderProps {
  title: string;
  description: string;
  step: string;
  plannedFeatures: readonly string[];
  backHref?: string;
}

export function FeaturePlaceholder({
  title,
  description,
  step,
  plannedFeatures,
  backHref = '/evaluations',
}: FeaturePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            {step}
          </div>
          <h1 className="mt-2 text-2xl font-bold">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          상위 화면
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="flex items-center gap-2 font-bold">
            <Wrench size={18} />
            이번 단계
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            URL과 화면 책임만 정의합니다. 실제 업무 로직은 해당 STEP에서 구현합니다.
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 font-bold">
            <Database size={18} />
            데이터 연결
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            STEP 2의 Schema와 이후 Service 계층을 통해 Supabase 데이터와 연결합니다.
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 font-bold">
            <LockKeyhole size={18} />
            접근 통제
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            STEP 4에서 Frontend, Server, Supabase RLS까지 Role별 권한을 강제합니다.
          </p>
        </Card>
      </div>

      <Card>
        <div className="font-bold">예정 기능</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plannedFeatures.map((feature) => (
            <div
              key={feature}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              {feature}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
