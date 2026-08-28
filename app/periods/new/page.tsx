import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { PeriodForm } from '@/components/evaluation-period/PeriodForm';
import { createPeriod } from '@/app/periods/actions';
import { requireHrAdmin } from '@/lib/hr/admin';
import { stringParam } from '@/lib/hr/utils';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewPeriodPage({ searchParams }: { searchParams: SearchParams }) {
  await requireHrAdmin();
  const sp = await searchParams;

  return (
    <PageShell title="평가기간 생성" description="자기평가부터 Calibration, 결과 공개까지 전체 평가 일정을 설정합니다.">
      <Notice error={stringParam(sp.error)} />
      <div className="flex justify-end">
        <Link href="/periods" className="rounded-xl border px-4 py-2 text-sm font-semibold">
          목록으로
        </Link>
      </div>
      <Card>
        <PeriodForm action={createPeriod} submitLabel="평가기간 생성" />
      </Card>
    </PageShell>
  );
}
