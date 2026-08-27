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
const REVIEW_ROLES: readonly Role[] = [
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
    href: '/evaluations',
    icon: 'evaluation',
    roles: ALL_ROLES,
    children: [
      { label: '자기평가', href: '/evaluations/self', roles: ALL_ROLES },
      {
        label: '1차 평가',
        href: '/evaluations/first',
        roles: ['first_evaluator', 'leader', 'hr_admin', 'super_admin'],
      },
      {
        label: '2차 Review',
        href: '/evaluations/second',
        roles: ['second_evaluator', 'leader', 'hr_admin', 'super_admin'],
      },
      { label: '평가결과', href: '/evaluations/results', roles: ALL_ROLES },
    ],
  },
  {
    label: '관찰일지',
    href: '/observations',
    icon: 'observation',
    roles: REVIEW_ROLES,
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
    ],
  },
  {
    label: '평가기간',
    href: '/periods',
    icon: 'period',
    roles: MANAGEMENT_ROLES,
  },
  {
    label: '평가문항',
    href: '/questions',
    icon: 'question',
    roles: MANAGEMENT_ROLES,
  },
  {
    label: 'Calibration',
    href: '/calibration',
    icon: 'calibration',
    roles: ['leader', 'hr_admin', 'super_admin'],
  },
  {
    label: '9-Block',
    href: '/nine-block',
    icon: 'nineBlock',
    roles: ['leader', 'hr_admin', 'super_admin'],
  },
  {
    label: '성장계획',
    href: '/growth-plans',
    icon: 'growth',
    roles: ALL_ROLES,
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
    ],
  },
] as const;
