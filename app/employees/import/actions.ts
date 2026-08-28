'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireHrAdmin } from '@/lib/hr/admin';

const rowSchema = z.object({
  employee_no: z.string().min(1),
  name: z.string().min(1),
  email: z.string().nullable(),
  hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employment_type: z.string().min(1),
  employment_status: z.enum(['active', 'leave', 'resigned']),
  department: z.string().nullable(),
  job_level: z.string().nullable(),
  position: z.string().nullable(),
  leader_employee_no: z.string().nullable(),
  is_leader: z.boolean(),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
});

export type BulkImportResult = {
  ok: boolean;
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; employee_no?: string; message: string }>;
  message: string;
};

type ImportRow = z.infer<typeof rowSchema>;

function normalize(value: unknown) {
  if (value == null) return '';
  return String(value).trim();
}

function optional(value: unknown) {
  const v = normalize(value);
  return v || null;
}

function key(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function parseStatus(value: unknown): 'active' | 'leave' | 'resigned' | null {
  const v = normalize(value).toLowerCase();
  if (['active', '재직', '재직중'].includes(v)) return 'active';
  if (['leave', '휴직', '휴직중'].includes(v)) return 'leave';
  if (['resigned', '퇴사', '퇴직', '퇴사자'].includes(v)) return 'resigned';
  return null;
}

function parseBoolean(value: unknown) {
  const v = normalize(value).toLowerCase();
  return ['y', 'yes', 'true', '1', '리더', 'o', '○'].includes(v);
}

function parseDate(value: unknown) {
  const raw = normalize(value);
  if (!raw) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}[./]\d{1,2}[./]\d{1,2}$/.test(raw)) {
    const parts = raw.split(/[./]/).map(Number);
    return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
  }

  // Excel serial date, sent from client as a numeric-looking string
  const num = Number(raw);
  if (Number.isFinite(num) && num > 20000 && num < 80000) {
    const utc = Math.round((num - 25569) * 86400 * 1000);
    return new Date(utc).toISOString().slice(0, 10);
  }

  return raw;
}

function readRawRow(raw: Record<string, unknown>): ImportRow | null {
  const status = parseStatus(raw.employment_status);
  if (!status) return null;

  return {
    employee_no: normalize(raw.employee_no),
    name: normalize(raw.name),
    email: optional(raw.email),
    hire_date: parseDate(raw.hire_date),
    employment_type: normalize(raw.employment_type),
    employment_status: status,
    department: optional(raw.department),
    job_level: optional(raw.job_level),
    position: optional(raw.position),
    leader_employee_no: optional(raw.leader_employee_no),
    is_leader: parseBoolean(raw.is_leader),
    phone: optional(raw.phone),
    notes: optional(raw.notes),
  };
}

export async function bulkImportEmployees(rowsJson: string): Promise<BulkImportResult> {
  const { supabase } = await requireHrAdmin();

  let rawRows: Record<string, unknown>[];
  try {
    const parsed = JSON.parse(rowsJson);
    if (!Array.isArray(parsed)) throw new Error();
    rawRows = parsed;
  } catch {
    return {
      ok: false,
      inserted: 0,
      skipped: 0,
      errors: [{ row: 0, message: '업로드 데이터 형식을 읽을 수 없습니다.' }],
      message: '엑셀 데이터를 다시 업로드해주세요.',
    };
  }

  if (rawRows.length === 0) {
    return { ok: false, inserted: 0, skipped: 0, errors: [], message: '등록할 행이 없습니다.' };
  }
  if (rawRows.length > 1000) {
    return {
      ok: false,
      inserted: 0,
      skipped: 0,
      errors: [{ row: 0, message: '한 번에 최대 1,000명까지 등록할 수 있습니다.' }],
      message: '엑셀을 나누어 업로드해주세요.',
    };
  }

  const [
    { data: departments, error: departmentError },
    { data: jobLevels, error: jobLevelError },
    { data: positions, error: positionError },
    { data: currentEmployees, error: employeeError },
  ] = await Promise.all([
    supabase.from('departments').select('id,name').eq('is_active', true),
    supabase.from('job_levels').select('id,name').eq('is_active', true),
    supabase.from('positions').select('id,name').eq('is_active', true),
    supabase.from('employees').select('id,employee_no,name'),
  ]);

  const initialError = departmentError || jobLevelError || positionError || employeeError;
  if (initialError) {
    return {
      ok: false,
      inserted: 0,
      skipped: 0,
      errors: [{ row: 0, message: initialError.message }],
      message: '기준정보를 불러오지 못했습니다.',
    };
  }

  const departmentMap = new Map((departments ?? []).map((x) => [key(x.name), x.id]));
  const jobLevelMap = new Map((jobLevels ?? []).map((x) => [key(x.name), x.id]));
  const positionMap = new Map((positions ?? []).map((x) => [key(x.name), x.id]));
  const currentEmployeeMap = new Map((currentEmployees ?? []).map((x) => [key(x.employee_no), x]));
  const duplicateInFile = new Set<string>();

  const errors: BulkImportResult['errors'] = [];
  const validRows: Array<{
    sourceRow: number;
    row: ImportRow;
    payload: Record<string, unknown>;
  }> = [];

  let skipped = 0;

  rawRows.forEach((raw, index) => {
    const sourceRow = index + 2; // Excel header is row 1
    const converted = readRawRow(raw);

    if (!converted) {
      errors.push({
        row: sourceRow,
        employee_no: normalize(raw.employee_no),
        message: '재직상태는 재직/휴직/퇴사 중 하나로 입력해주세요.',
      });
      return;
    }

    const parsed = rowSchema.safeParse(converted);
    if (!parsed.success) {
      errors.push({
        row: sourceRow,
        employee_no: converted.employee_no,
        message: parsed.error.issues[0]?.message ?? '필수값을 확인해주세요.',
      });
      return;
    }

    const row = parsed.data;
    const empKey = key(row.employee_no);

    if (duplicateInFile.has(empKey)) {
      errors.push({ row: sourceRow, employee_no: row.employee_no, message: '엑셀 안에서 사번이 중복되었습니다.' });
      return;
    }
    duplicateInFile.add(empKey);

    if (currentEmployeeMap.has(empKey)) {
      skipped += 1;
      return;
    }

    const departmentId = row.department ? departmentMap.get(key(row.department)) : null;
    const jobLevelId = row.job_level ? jobLevelMap.get(key(row.job_level)) : null;
    const positionId = row.position ? positionMap.get(key(row.position)) : null;
    const leader = row.leader_employee_no ? currentEmployeeMap.get(key(row.leader_employee_no)) : null;

    if (row.department && !departmentId) {
      errors.push({ row: sourceRow, employee_no: row.employee_no, message: `등록되지 않은 부서입니다: ${row.department}` });
      return;
    }
    if (row.job_level && !jobLevelId) {
      errors.push({ row: sourceRow, employee_no: row.employee_no, message: `등록되지 않은 직급입니다: ${row.job_level}` });
      return;
    }
    if (row.position && !positionId) {
      errors.push({ row: sourceRow, employee_no: row.employee_no, message: `등록되지 않은 직책입니다: ${row.position}` });
      return;
    }
    if (row.leader_employee_no && !leader) {
      errors.push({
        row: sourceRow,
        employee_no: row.employee_no,
        message: `리더 사번을 찾을 수 없습니다: ${row.leader_employee_no}`,
      });
      return;
    }

    validRows.push({
      sourceRow,
      row,
      payload: {
        employee_no: row.employee_no,
        name: row.name,
        email: row.email,
        hire_date: row.hire_date,
        resignation_date: row.employment_status === 'resigned' ? row.hire_date : null,
        employment_status: row.employment_status,
        employment_type: row.employment_type,
        department_id: departmentId,
        job_level_id: jobLevelId,
        position_id: positionId,
        leader_id: leader?.id ?? null,
        is_leader: row.is_leader,
        phone: row.phone,
        notes: row.notes,
      },
    });
  });

  // Validation errors block the whole import so the user can fix the file first.
  if (errors.length > 0) {
    return {
      ok: false,
      inserted: 0,
      skipped,
      errors,
      message: `오류 ${errors.length}건이 있어 등록하지 않았습니다. 엑셀을 수정한 뒤 다시 업로드해주세요.`,
    };
  }

  let inserted = 0;

  // Chunk insert for stable server requests.
  for (let i = 0; i < validRows.length; i += 200) {
    const chunk = validRows.slice(i, i + 200);
    const { error } = await supabase.from('employees').insert(chunk.map((x) => x.payload));
    if (error) {
      return {
        ok: false,
        inserted,
        skipped,
        errors: [{ row: chunk[0]?.sourceRow ?? 0, message: error.message }],
        message: `일괄등록 도중 오류가 발생했습니다. ${inserted}명까지 등록되었습니다.`,
      };
    }
    inserted += chunk.length;
  }

  revalidatePath('/employees');
  revalidatePath('/organization');

  return {
    ok: true,
    inserted,
    skipped,
    errors: [],
    message: `신규 ${inserted}명 등록 완료${skipped ? ` · 기존 사번 ${skipped}명 건너뜀` : ''}`,
  };
}
