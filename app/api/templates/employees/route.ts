import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireHrAdmin } from '@/lib/hr/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  await requireHrAdmin();

  const rows = [{
    사번: 'AM100',
    이름: '홍길동',
    이메일: 'hong@amcompany.co.kr',
    입사일: '2026-09-01',
    퇴사일: '',
    고용형태: '정규직',
    재직상태: '재직',
    부서: '경영지원',
    직급: '프로',
    직책: '',
    리더사번: '',
    리더여부: 'N',
    전화번호: '010-0000-0000',
    비고: '',
  }];

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    {wch:12},{wch:12},{wch:28},{wch:14},{wch:14},{wch:14},{wch:12},
    {wch:18},{wch:14},{wch:14},{wch:14},{wch:12},{wch:18},{wch:28},
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '직원등록');

  const guideRows = [
    ['항목','필수','입력방법'],
    ['사번','필수','기존 직원과 중복되지 않는 사번'],
    ['이름','필수','직원 이름'],
    ['이메일','선택','이메일 형식'],
    ['입사일','필수','YYYY-MM-DD'],
    ['퇴사일','퇴사자 필수','재직상태가 퇴사인 경우 YYYY-MM-DD'],
    ['고용형태','필수','정규직 / 계약직 / 인턴 등'],
    ['재직상태','필수','재직 / 휴직 / 퇴사'],
    ['부서','선택','조직관리에 등록된 부서명과 정확히 동일'],
    ['직급','선택','직급관리에 등록된 직급명과 정확히 동일'],
    ['직책','선택','직책관리에 등록된 직책명과 정확히 동일'],
    ['리더사번','선택','이미 시스템에 등록된 리더 사번'],
    ['리더여부','선택','Y 또는 N'],
    ['전화번호','선택','문자열'],
    ['비고','선택','자유입력'],
  ];

  const guide = XLSX.utils.aoa_to_sheet(guideRows);
  guide['!cols'] = [{wch:16},{wch:14},{wch:54}];
  XLSX.utils.book_append_sheet(wb, guide, '작성방법');

  const buffer = XLSX.write(wb, { type:'buffer', bookType:'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':'attachment; filename="AMCOMPANY_employee_import_template.xlsx"',
      'Cache-Control':'no-store',
    },
  });
}
