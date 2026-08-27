import type { Role } from '@/types';

export const ROLE_LABELS: Record<Role, string> = {
  employee: '직원',
  first_evaluator: '1차 평가자',
  second_evaluator: '2차 평가자',
  leader: '리더',
  hr_admin: 'HR 관리자',
  super_admin: '최고관리자',
};

const ROLE_PRIORITY: Role[] = [
  'super_admin',
  'hr_admin',
  'leader',
  'second_evaluator',
  'first_evaluator',
  'employee',
];

export function isRole(value: string): value is Role {
  return value in ROLE_LABELS;
}

export function normalizeRoles(values: readonly string[] | null | undefined): Role[] {
  const unique = new Set<Role>();
  for (const value of values ?? []) {
    if (isRole(value)) unique.add(value);
  }
  return [...unique];
}

export function getPrimaryRole(roles: readonly Role[]): Role | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null;
}
