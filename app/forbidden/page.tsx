import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-xl rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
      <div className="text-sm font-bold text-red-600">403 · ACCESS DENIED</div>
      <h1 className="mt-3 text-2xl font-black">접근 권한이 없습니다.</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        현재 계정의 Role 또는 조직 범위에 허용되지 않은 화면입니다. URL을 직접 입력해도 동일하게 차단됩니다.
      </p>
      <Link href="/dashboard" className="mt-6 inline-block rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white">
        Dashboard로 돌아가기
      </Link>
    </div>
  );
}
