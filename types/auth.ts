import type { Role } from '@/types';

export interface CurrentUserContext {
  userId: string;
  email: string;
  employeeId: string | null;
  employeeNo: string | null;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
  jobLevelName: string | null;
  positionName: string | null;
  roles: Role[];
  primaryRole: Role | null;
}
