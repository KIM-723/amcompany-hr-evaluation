'use client';

import { useMemo, useState, useTransition } from 'react';
import * as XLSX from 'xlsx';
import { bulkImportEmployees, type BulkImportResult } from '@/app/employees/import/actions';

type PreviewRow = {
  employee_no: string;
  name: string;
  email: string;
  hire_date: string;
  resignation_date: string;
  employment_type: string;
  employment_status: string;
  department: string;
  job_level: string;
  position: string;
  leader_employee_no: string;
  is_leader: string;
  phone: string;
  notes: string;
};

const HEADER_MAP: Record<string, keyof PreviewRow> = {
  '사번': 'employee_no',
  '이름': 'name',
  '이메일': 'email',
  '입사일': 'hire_date',
  '퇴사일': 'resignation_date',
  '고용형태': 'employment_type',
  '재직상태': 'employment_status',
  '부서': 'department',
  '직급': 'job_level',
  '직책': 'position',
  '리더사번': 'leader_employee_no',
  '리더여부': 'is_leader',
  '전화번호': 'phone',
  '비고': 'notes',
};

const REQUIRED_HEADERS = ['사번','이름','입사일','고용형태','재직상태'];

function blankRow(): PreviewRow {
  return {
    employee_no:'', name:'', email:'', hire_date:'', resignation_date:'',
    employment_type:'', employment_status:'', department:'', job_level:'',
    position:'', leader_employee_no:'', is_leader:'', phone:'', notes:'',
  };
}

function normalizeCell(value: unknown) {
  if (value == null) return '';
  return String(value).trim();
}

export function EmployeeExcelImport() {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [clientErrors, setClientErrors] = useState<string[]>([]);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const preview = useMemo(() => rows.slice(0, 20), [rows]);

  async function handleFile(file: File | undefined) {
    setResult(null);
    setClientErrors([]);
    setRows([]);
    setFileName(file?.name ?? '');
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: false });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error('첫 번째 Sheet를 찾을 수 없습니다.');

      const sheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: '',
        raw: false,
      });

      if (matrix.length < 2) {
        setClientErrors(['헤더 아래에 등록할 직원 데이터가 없습니다.']);
        return;
      }

      const headers = (matrix[0] ?? []).map(normalizeCell);
      const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));

      if (missing.length) {
        setClientErrors([`필수 열이 없습니다: ${missing.join(', ')}`]);
        return;
      }

      const converted = matrix
        .slice(1)
        .filter((row) => row.some((cell) => normalizeCell(cell) !== ''))
        .map((row) => {
          const item = blankRow();
          headers.forEach((header, index) => {
            const target = HEADER_MAP[header];
            if (target) item[target] = normalizeCell(row[index]);
          });
          return item;
        });

      const errors: string[] = [];

      converted.forEach((row, index) => {
        const excelRow = index + 2;
        if (!row.employee_no) errors.push(`${excelRow}행: 사번 필수`);
        if (!row.name) errors.push(`${excelRow}행: 이름 필수`);
        if (!row.hire_date) errors.push(`${excelRow}행: 입사일 필수`);
        if (!row.employment_type) errors.push(`${excelRow}행: 고용형태 필수`);
        if (!row.employment_status) errors.push(`${excelRow}행: 재직상태 필수`);
        if (['퇴사','퇴직','resigned','퇴사자'].includes(row.employment_status.toLowerCase()) && !row.resignation_date) {
          errors.push(`${excelRow}행: 퇴사자는 퇴사일 필수`);
        }
      });

      setRows(converted);
      setClientErrors(errors.slice(0, 50));
    } catch (error) {
      setClientErrors([error instanceof Error ? error.message : '엑셀을 읽지 못했습니다.']);
    }
  }

  function submitImport() {
    setResult(null);
    startTransition(async () => {
      const response = await bulkImportEmployees(JSON.stringify(rows));
      setResult(response);
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="font-bold">사용방법</div>
        <div className="mt-1">① 양식 다운로드 → ② 직원정보 입력 → ③ Excel 업로드 → ④ 미리보기 → ⑤ 일괄등록</div>
        <div className="mt-2 text-xs text-blue-700">
          퇴사자를 등록할 경우 재직상태를 '퇴사'로 입력하고 퇴사일을 반드시 입력해주세요.
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <a href="/api/templates/employees" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Excel 양식 다운로드</a>
        <label className="cursor-pointer rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">
          Excel 파일 선택
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
        </label>
        {fileName && <span className="self-center text-sm text-slate-500">{fileName}</span>}
      </div>

      {clientErrors.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="font-bold text-red-700">업로드 파일 확인 필요</div>
          <div className="mt-2 max-h-48 overflow-y-auto text-sm text-red-700">
            {clientErrors.map((error, index) => <div key={index}>{error}</div>)}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">업로드 데이터 {rows.length}명</div>
            <div className="text-xs text-slate-500">미리보기 최대 20명</div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1450px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['사번','이름','이메일','입사일','퇴사일','고용형태','상태','부서','직급','직책','리더사번','리더','전화번호','비고'].map((h) => (
                    <th key={h} className="px-3 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, index) => (
                  <tr key={`${row.employee_no}-${index}`} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold">{row.employee_no}</td>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.email}</td>
                    <td className="px-3 py-2">{row.hire_date}</td>
                    <td className="px-3 py-2">{row.resignation_date}</td>
                    <td className="px-3 py-2">{row.employment_type}</td>
                    <td className="px-3 py-2">{row.employment_status}</td>
                    <td className="px-3 py-2">{row.department}</td>
                    <td className="px-3 py-2">{row.job_level}</td>
                    <td className="px-3 py-2">{row.position}</td>
                    <td className="px-3 py-2">{row.leader_employee_no}</td>
                    <td className="px-3 py-2">{row.is_leader}</td>
                    <td className="px-3 py-2">{row.phone}</td>
                    <td className="px-3 py-2">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={submitImport}
              disabled={isPending || clientErrors.length > 0}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {isPending ? '등록 중...' : `${rows.length}명 일괄등록`}
            </button>
          </div>
        </>
      )}

      {result && (
        <div className={`rounded-2xl border p-4 ${result.ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
          <div className={`font-bold ${result.ok ? 'text-emerald-800' : 'text-red-700'}`}>{result.message}</div>
          <div className="mt-2 text-sm">신규등록 {result.inserted}명 · 기존 사번 건너뜀 {result.skipped}명 · 오류 {result.errors.length}건</div>
          {result.errors.length > 0 && (
            <div className="mt-3 max-h-60 overflow-y-auto text-sm text-red-700">
              {result.errors.map((error, index) => (
                <div key={index}>{error.row ? `${error.row}행` : ''} {error.employee_no ? `(${error.employee_no})` : ''}: {error.message}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
