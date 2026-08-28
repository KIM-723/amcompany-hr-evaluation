'use server';

import { revalidatePath } from 'next/cache';
import { requireHrAdmin } from '@/lib/hr/admin';

type ImportRow = {
  employee_no: string;
  name: string;
  email: string | null;
  hire_date: string;
  resignation_date: string | null;
  employment_type: string;
  employment_status: 'active' | 'leave' | 'resigned';
  department: string | null;
  job_level: string | null;
  position: string | null;
  leader_employee_no: string | null;
  is_leader: boolean;
  phone: string | null;
  notes: string | null;
};


export type BulkImportResult = {
  ok: boolean;
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; employee_no?: string; message: string }>;
  message: string;
};



function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isJwtIssuedAtFuture(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';
  return message.toLowerCase().includes('jwt issued at future');
}

async function withJwtFutureRetry<T extends { error?: unknown }>(
  request: () => PromiseLike<T>,
): Promise<T> {
  const waits = [0, 1500, 4000, 8000];
  let lastResult: T | null = null;

  for (const wait of waits) {
    if (wait > 0) await sleep(wait);

    const result = await request();
    lastResult = result;

    if (!isJwtIssuedAtFuture(result.error)) {
      return result;
    }
  }

  return lastResult as T;
}

function normalize(value: unknown) {
  if (value == null) return '';

  // Excel numeric cells such as 202503102 are valid employee numbers.
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(value);
  }

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

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return `${iso[1]}-${String(Number(iso[2])).padStart(2, '0')}-${String(Number(iso[3])).padStart(2, '0')}`;
  }

  const separated = raw.match(/^(\d{4})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})(?:\s+.*)?$/);
  if (separated) {
    return `${separated[1]}-${String(Number(separated[2])).padStart(2, '0')}-${String(Number(separated[3])).padStart(2, '0')}`;
  }

  const korean = raw.match(/^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?(?:\s+.*)?$/);
  if (korean) {
    return `${korean[1]}-${String(Number(korean[2])).padStart(2, '0')}-${String(Number(korean[3])).padStart(2, '0')}`;
  }

  const dateTime = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T]/);
  if (dateTime) {
    return `${dateTime[1]}-${String(Number(dateTime[2])).padStart(2, '0')}-${String(Number(dateTime[3])).padStart(2, '0')}`;
  }

  const num = Number(raw.replace(/,/g, ''));
  if (Number.isFinite(num) && num > 20000 && num < 80000) {
    const utc = Math.round((num - 25569) * 86400 * 1000);
    return new Date(utc).toISOString().slice(0, 10);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return raw;
}


function validateRow(row: ImportRow): string | null {
  if (!row.employee_no) return '사번이 비어 있습니다.';
  if (!row.name) return '이름이 비어 있습니다.';
  if (!row.hire_date) return '입사일이 비어 있습니다.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.hire_date)) {
    return `입사일 형식 오류 (${row.hire_date}): YYYY-MM-DD 형식으로 입력해주세요.`;
  }
  if (!row.employment_type) return '고용형태가 비어 있습니다.';

  if (row.employment_status === 'resigned' && !row.resignation_date) {
    return '퇴사자는 퇴사일이 필수입니다.';
  }

  if (row.resignation_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.resignation_date)) {
      return `퇴사일 형식 오류 (${row.resignation_date}): YYYY-MM-DD 형식으로 입력해주세요.`;
    }
    if (row.resignation_date < row.hire_date) {
      return '퇴사일은 입사일보다 빠를 수 없습니다.';
    }
  }

  // Numeric-looking employee numbers are allowed.
  // They are stored as text in the DB to avoid numeric precision/format issues.
  if (row.employee_no.length > 50) {
    return '사번이 너무 깁니다. 50자 이하로 입력해주세요.';
  }

  return null;
}

function readRawRow(raw: Record<string, unknown>): ImportRow | null {
  const status = parseStatus(raw.employment_status);
  if (!status) return null;

  return {
    employee_no: normalize(raw.employee_no),
    name: normalize(raw.name),
    email: optional(raw.email),
    hire_date: parseDate(raw.hire_date),
    resignation_date: status === 'resigned' ? optional(parseDate(raw.resignation_date)) : null,
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
      ok: false, inserted: 0, skipped: 0,
      errors: [{ row: 0, message: '업로드 데이터 형식을 읽을 수 없습니다.' }],
      message: '엑셀 데이터를 다시 업로드해주세요.',
    };
  }

  if (rawRows.length === 0) {
    return { ok: false, inserted: 0, skipped: 0, errors: [], message: '등록할 행이 없습니다.' };
  }

  if (rawRows.length > 1000) {
    return {
      ok: false, inserted: 0, skipped: 0,
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
    withJwtFutureRetry(() => supabase.from('departments').select('id,name').eq('is_active', true)),
    withJwtFutureRetry(() => supabase.from('job_levels').select('id,name').eq('is_active', true)),
    withJwtFutureRetry(() => supabase.from('positions').select('id,name').eq('is_active', true)),
    withJwtFutureRetry(() => supabase.from('employees').select('id,employee_no,name')),
  ]);

  const initialError = departmentError || jobLevelError || positionError || employeeError;
  if (initialError) {
    return {
      ok: false, inserted: 0, skipped: 0,
      errors: [{ row: 0, message: initialError.message }],
      message: isJwtIssuedAtFuture(initialError)
        ? 'Supabase 서버 시간 동기화 문제로 요청이 거절되었습니다. 잠시 후 다시 시도하거나 Supabase 프로젝트를 재시작해주세요.'
        : '기준정보를 불러오지 못했습니다.',
    };
  }

  const departmentMap = new Map((departments ?? []).map((x) => [key(x.name), x.id]));
  const jobLevelMap = new Map((jobLevels ?? []).map((x) => [key(x.name), x.id]));
  const positionMap = new Map((positions ?? []).map((x) => [key(x.name), x.id]));
  const currentEmployeeMap = new Map((currentEmployees ?? []).map((x) => [key(x.employee_no), x]));
  const duplicateInFile = new Set<string>();

  const errors: BulkImportResult['errors'] = [];
  const validRows: Array<{ sourceRow: number; row: ImportRow; payload: Record<string, unknown> }> = [];
  let skipped = 0;

  rawRows.forEach((raw, index) => {
    const sourceRow = index + 2;
    const converted = readRawRow(raw);

    if (!converted) {
      errors.push({
        row: sourceRow,
        employee_no: normalize(raw.employee_no),
        message: '재직상태는 재직/휴직/퇴사 중 하나로 입력해주세요.',
      });
      return;
    }

    const validationError = validateRow(converted);
    if (validationError) {
      errors.push({
        row: sourceRow,
        employee_no: converted.employee_no,
        message: validationError,
      });
      return;
    }

    const row = converted;
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
      errors.push({ row: sourceRow, employee_no: row.employee_no, message: `리더 사번을 찾을 수 없습니다: ${row.leader_employee_no}` });
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
        resignation_date: row.resignation_date,
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

  if (errors.length > 0) {
    return {
      ok: false, inserted: 0, skipped, errors,
      message: `오류 ${errors.length}건이 있어 등록하지 않았습니다. 엑셀을 수정한 뒤 다시 업로드해주세요.`,
    };
  }

  let inserted = 0;

  for (let i = 0; i < validRows.length; i += 200) {
    const chunk = validRows.slice(i, i + 200);
    const { error } = await withJwtFutureRetry(
      () => supabase.from('employees').insert(chunk.map((x) => x.payload)),
    );

    if (error) {
      return {
        ok: false, inserted, skipped,
        errors: [{ row: chunk[0]?.sourceRow ?? 0, message: error.message }],
        message: `일괄등록 도중 오류가 발생했습니다. ${inserted}명까지 등록되었습니다.`,
      };
    }
    inserted += chunk.length;
  }

  revalidatePath('/employees');
  revalidatePath('/organization');

  return {
    ok: true, inserted, skipped, errors: [],
    message: `신규 ${inserted}명 등록 완료${skipped ? ` · 기존 사번 ${skipped}명 건너뜀` : ''}`,
  };
}
