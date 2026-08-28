'use client';

import { useMemo, useState, useTransition } from 'react';
import * as XLSX from 'xlsx';
import {
  importDiagnosisExcels,
  type DiagnosisImportResult,
} from '@/app/diagnoses/actions';
import type {
  DiagnosisExcelPayload,
  DiagnosisSummaryItem,
  GrowthDirectionItem,
  GrowthPointItem,
} from '@/lib/diagnosis/utils';

type ParsedFile = DiagnosisExcelPayload & {
  parse_error?: string;
};

function text(value: unknown) {
  if (value == null) return '';
  return String(value).trim();
}

function cell(rows: unknown[][], row: number, col: number) {
  return text(rows[row - 1]?.[col - 1]);
}

function parseWorkbook(fileName: string, buffer: ArrayBuffer): ParsedFile {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName =
    workbook.SheetNames.find((name) => name.trim() === '미팅내용') ??
    workbook.SheetNames[0];

  if (!sheetName) {
    return {
      file_name: fileName,
      department: '',
      job_level: '',
      employee_name: '',
      diagnosis_summary: [],
      growth_points: [],
      growth_directions: [],
      other_comment: '',
      parse_error: 'Excel 시트를 찾을 수 없습니다.',
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  const diagnosisSummary: DiagnosisSummaryItem[] = [
    { category: '성장', content: cell(rows, 11, 3), evidence: cell(rows, 11, 4) },
    { category: '신뢰', content: cell(rows, 12, 3), evidence: cell(rows, 12, 4) },
    { category: '전문성', content: cell(rows, 13, 3), evidence: cell(rows, 13, 4) },
    { category: '감각', content: cell(rows, 14, 3), evidence: cell(rows, 14, 4) },
  ];

  const growthPoints: GrowthPointItem[] = [
    { category: '성과', detail: cell(rows, 19, 3), reason: cell(rows, 19, 4) },
    { category: '역량', detail: cell(rows, 20, 3), reason: cell(rows, 20, 4) },
    { category: '태도', detail: cell(rows, 21, 3), reason: cell(rows, 21, 4) },
  ];

  const growthDirections: GrowthDirectionItem[] = [26, 27, 28]
    .map((row) => ({
      area: [cell(rows, row, 2), cell(rows, row, 3)]
        .filter(Boolean)
        .join(' ')
        .trim(),
      action: cell(rows, row, 4),
    }))
    .filter((item) => item.area || item.action);

  const commentHeadingIndex = rows.findIndex((row) =>
    row.some((value) => text(value).includes('4. 기타 코멘트')),
  );

  let otherComment = '';
  if (commentHeadingIndex >= 0) {
    otherComment = rows
      .slice(commentHeadingIndex + 1, commentHeadingIndex + 6)
      .flat()
      .map(text)
      .filter(Boolean)
      .join('\n');
  }

  const payload: ParsedFile = {
    file_name: fileName,
    department: cell(rows, 4, 3),
    job_level: cell(rows, 5, 3),
    employee_name: cell(rows, 6, 3),
    diagnosis_summary: diagnosisSummary,
    growth_points: growthPoints,
    growth_directions: growthDirections,
    other_comment: otherComment,
  };

  if (!payload.employee_name) {
    payload.parse_error = '성명(C6)을 읽을 수 없습니다.';
  }

  return payload;
}

export function DiagnosisExcelUploader({
  periods,
}: {
  periods: Array<{ id: string; name: string; status: string }>;
}) {
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? '');
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [result, setResult] = useState<DiagnosisImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  const validFiles = useMemo(
    () => files.filter((file) => !file.parse_error),
    [files],
  );

  async function readFiles(fileList: FileList | null) {
    if (!fileList) return;

    const next: ParsedFile[] = [];

    for (const file of Array.from(fileList)) {
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        next.push({
          file_name: file.name,
          department: '',
          job_level: '',
          employee_name: '',
          diagnosis_summary: [],
          growth_points: [],
          growth_directions: [],
          other_comment: '',
          parse_error: 'xlsx 파일만 업로드할 수 있습니다.',
        });
        continue;
      }

      try {
        const buffer = await file.arrayBuffer();
        next.push(parseWorkbook(file.name, buffer));
      } catch (error) {
        next.push({
          file_name: file.name,
          department: '',
          job_level: '',
          employee_name: '',
          diagnosis_summary: [],
          growth_points: [],
          growth_directions: [],
          other_comment: '',
          parse_error:
            error instanceof Error ? error.message : 'Excel 파일을 읽지 못했습니다.',
        });
      }
    }

    setFiles(next);
    setResult(null);
  }

  function importFiles() {
    if (!periodId || validFiles.length === 0) return;

    startTransition(async () => {
      const response = await importDiagnosisExcels(
        periodId,
        JSON.stringify(validFiles),
      );
      setResult(response);
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-semibold">
          평가기간 *
          <select
            value={periodId}
            onChange={(event) => setPeriodId(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          >
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name} · {period.status}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold">
          구성원 Excel 파일 *
          <input
            type="file"
            multiple
            accept=".xlsx"
            onChange={(event) => readFiles(event.target.files)}
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            첨부된 AMCOMPANY 인사진단 Excel 양식을 그대로 사용합니다. 여러 파일을 한 번에 선택할 수 있습니다.
          </span>
        </label>
      </div>

      {files.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="border-b bg-slate-50 px-4 py-3 text-sm font-bold">
            업로드 미리보기 · {files.length}개
          </div>

          <div className="divide-y">
            {files.map((file) => {
              const summaryCount = file.diagnosis_summary.filter(
                (item) => item.content || item.evidence,
              ).length;
              const growthCount = file.growth_points.filter(
                (item) => item.detail || item.reason,
              ).length;

              return (
                <div
                  key={file.file_name}
                  className="grid gap-2 px-4 py-3 md:grid-cols-[1.3fr_1fr_1fr_1fr]"
                >
                  <div>
                    <div className="font-semibold">{file.file_name}</div>
                    {file.parse_error && (
                      <div className="mt-1 text-xs font-semibold text-red-600">
                        {file.parse_error}
                      </div>
                    )}
                  </div>

                  <div className="text-sm">
                    <span className="text-slate-500">대상자</span>
                    <div className="font-semibold">
                      {file.employee_name || '-'}
                    </div>
                  </div>

                  <div className="text-sm">
                    <span className="text-slate-500">부서 / 직무레벨</span>
                    <div>
                      {file.department || '-'} / {file.job_level || '-'}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600">
                    <div>진단요약 입력 {summaryCount}/4</div>
                    <div>성장포인트 입력 {growthCount}/3</div>
                    <div>성장방향 {file.growth_directions.length}건</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {result && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            result.errors.length > 0
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          <div className="font-bold">{result.message}</div>

          {result.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              {result.errors.map((error, index) => (
                <div key={`${error.file_name}-${index}`}>
                  {error.file_name} · {error.employee_name || '대상자 미확인'}:
                  {' '}
                  {error.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={importFiles}
          disabled={pending || !periodId || validFiles.length === 0}
          className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending
            ? '인사진단 작성 중...'
            : `${validFiles.length}개 Excel → 인사진단 자동 작성`}
        </button>
      </div>
    </div>
  );
}
