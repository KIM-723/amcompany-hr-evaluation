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

function sheetCell(sheet: XLSX.WorkSheet, address: string) {
  return text(sheet[address]?.v);
}

function parseWorkbook(fileName: string, buffer: ArrayBuffer): ParsedFile {
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetName =
    workbook.SheetNames.find((name) => name.trim() === '성장방향성') ??
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

  // 중요:
  // sheet_to_json(header: 1)은 워크시트의 !ref 시작행부터 배열 index 0을 잡기 때문에
  // 첫 사용행이 2행인 현재 양식에서는 전체 행이 1칸씩 밀려 읽힐 수 있다.
  // AMCOMPANY 양식은 실제 셀 주소를 직접 읽어 절대 행 기준으로 파싱한다.
  const diagnosisSummary: DiagnosisSummaryItem[] = [
    {
      category: '성장',
      content: sheetCell(sheet, 'C11'),
      evidence: sheetCell(sheet, 'D11'),
    },
    {
      category: '신뢰',
      content: sheetCell(sheet, 'C12'),
      evidence: sheetCell(sheet, 'D12'),
    },
    {
      category: '전문성',
      content: sheetCell(sheet, 'C13'),
      evidence: sheetCell(sheet, 'D13'),
    },
    {
      category: '감각',
      content: sheetCell(sheet, 'C14'),
      evidence: sheetCell(sheet, 'D14'),
    },
  ];

  const growthPoints: GrowthPointItem[] = [
    {
      category: '성과',
      detail: sheetCell(sheet, 'C19'),
      reason: sheetCell(sheet, 'D19'),
    },
    {
      category: '역량',
      detail: sheetCell(sheet, 'C20'),
      reason: sheetCell(sheet, 'D20'),
    },
    {
      category: '태도',
      detail: sheetCell(sheet, 'C21'),
      reason: sheetCell(sheet, 'D21'),
    },
  ];

  const growthDirections: GrowthDirectionItem[] = [26, 27, 28]
    .map((row) => ({
      area: [
        sheetCell(sheet, `B${row}`),
        sheetCell(sheet, `C${row}`),
      ]
        .filter(Boolean)
        .join(' ')
        .trim(),
      action: sheetCell(sheet, `D${row}`),
    }))
    .filter((item) => item.area || item.action);

  // 현재 AMCOMPANY 양식은 기타 코멘트가 B31의 병합 셀에 입력된다.
  // 향후 행이 추가된 파일을 대비해 B31:D36 중 첫 비어있지 않은 실제 입력도 함께 확인한다.
  let otherComment = sheetCell(sheet, 'B31');

  if (!otherComment) {
    for (let row = 31; row <= 36; row += 1) {
      const candidate = [
        sheetCell(sheet, `B${row}`),
        sheetCell(sheet, `C${row}`),
        sheetCell(sheet, `D${row}`),
      ]
        .filter(Boolean)
        .join('\n')
        .trim();

      if (candidate) {
        otherComment = candidate;
        break;
      }
    }
  }

  const payload: ParsedFile = {
    file_name: fileName,

    // 실제 첨부양식 기준
    // C4 = 부서 / C5 = 직무레벨 / C6 = 성명
    department: sheetCell(sheet, 'C4'),
    job_level: sheetCell(sheet, 'C5'),
    employee_name: sheetCell(sheet, 'C6'),

    diagnosis_summary: diagnosisSummary,
    growth_points: growthPoints,
    growth_directions: growthDirections,
    other_comment: otherComment,
  };

  if (!payload.employee_name) {
    payload.parse_error =
      '성명(C6)을 읽을 수 없습니다. AMCOMPANY 인사진단 양식의 C6 셀을 확인해주세요.';
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
