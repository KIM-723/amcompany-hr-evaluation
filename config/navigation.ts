import type { Role } from '@/types';

export type NavigationIconKey =
  | 'dashboard'
  | 'evaluation'
  | 'observation'
  | 'employee'
  | 'organization'
  | 'period'
  | 'question'
  | 'calibration'
  | 'nineBlock'
  | 'growth'
  | 'stats'
  | 'settings';

export interface NavigationChild {
  label: string;
  href: string;
  roles: readonly Role[];
}
export interface NavigationItem {
  label: string;
  href: string;
  icon: NavigationIconKey;
  roles: readonly Role[];
  children?: readonly NavigationChild[];
}

export const ALL_ROLES: readonly Role[] = [
  'employee',
  'first_evaluator',
  'second_evaluator',
  'leader',
  'hr_admin',
  'super_admin',
] as const;

const MANAGEMENT_ROLES: readonly Role[] = ['hr_admin', 'super_admin'] as const;
const DIAGNOSIS_REVIEW_ROLES: readonly Role[] = [
  'first_evaluator',
  'second_evaluator',
  'leader',
  'hr_admin',
  'super_admin',
] as const;

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'dashboard',
    roles: ALL_ROLES,
  },
  {
    label: '인사진단',
    href: '/diagnoses',
    icon: 'evaluation',
    roles: ALL_ROLES,
    children: [
      {
        label: 'Excel 업로드',
        href: '/diagnoses/upload',
        roles: MANAGEMENT_ROLES,
      },
      {
        label: '진단 결과',
        href: '/diagnoses/results',
        roles: ALL_ROLES,
      },
      {
        label: '진단 작성',
        href: '/diagnoses',
        roles: DIAGNOSIS_REVIEW_ROLES,
      },
    ],
  },
  {
    label: '관찰일지',
    href: '/observations',
    icon: 'observation',
    roles: DIAGNOSIS_REVIEW_ROLES,
  },
  {
    label: '직원관리',
    href: '/employees',
    icon: 'employee',
    roles: MANAGEMENT_ROLES,
  },
  {
    label: '조직관리',
    href: '/organization',
    icon: 'organization',
    roles: MANAGEMENT_ROLES,
    children: [
      { label: '조직 Tree', href: '/organization', roles: MANAGEMENT_ROLES },
      { label: '직급관리', href: '/organization/job-levels', roles: MANAGEMENT_ROLES },
      { label: '직책관리', href: '/organization/positions', roles: MANAGEMENT_ROLES },
    ],
  },
  {
    label: '평가기간',
    href: '/periods',
    icon: 'period',
    roles: MANAGEMENT_ROLES,
  },
  {
    label: '통계',
    href: '/stats',
    icon: 'stats',
    roles: ['leader', 'hr_admin', 'super_admin'],
  },
  {
    label: '설정',
    href: '/settings',
    icon: 'settings',
    roles: MANAGEMENT_ROLES,
    children: [
      { label: '시스템 설정', href: '/settings', roles: MANAGEMENT_ROLES },
      { label: 'Role / 권한', href: '/settings/roles', roles: MANAGEMENT_ROLES },
      { label: '보안 점검', href: '/settings/security', roles: MANAGEMENT_ROLES },
    ],
  },
] as const;
