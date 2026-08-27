export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;

export type EmploymentStatus = 'active' | 'leave' | 'resigned';
export type SystemRole =
  | 'employee'
  | 'first_evaluator'
  | 'second_evaluator'
  | 'leader'
  | 'hr_admin'
  | 'super_admin';

export type EvaluationPeriodStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'calibration'
  | 'closed';

export type EvaluationStage = 'first' | 'second' | 'final';
export type EvaluationDecision =
  | 'approved'
  | 'commented'
  | 'revision_requested'
  | 'calibration_required';

export interface EvaluationSnapshotRecord {
  id: UUID;
  assignment_id: UUID;
  snapshot_version: number;
  period_snapshot: Record<string, unknown>;
  employee_snapshot: Record<string, unknown>;
  organization_snapshot: Record<string, unknown>;
  evaluator_snapshot: Record<string, unknown>;
  template_snapshot: Record<string, unknown>;
  core_values_snapshot: unknown[];
  snapshot_checksum: string | null;
  created_by: UUID | null;
  created_at: ISODateTime;
}

export interface EvaluationResultRecord {
  id: UUID;
  assignment_id: UUID;
  final_evaluation_id: UUID | null;
  performance_score: number | null;
  competency_score: number | null;
  attitude_score: number | null;
  leadership_score: number | null;
  total_score: number | null;
  core_value_scores: Record<string, number>;
  strengths: unknown[];
  growth_needs: unknown[];
  result_snapshot: Record<string, unknown>;
  is_released: boolean;
  released_at: ISODateTime | null;
  finalized_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface EmployeeMasterRecord {
  id: UUID;
  user_id: UUID | null;
  employee_no: string;
  name: string;
  email: string | null;
  phone: string | null;
  hire_date: ISODate;
  resignation_date: ISODate | null;
  employment_status: EmploymentStatus;
  employment_type: string;
  department_id: UUID | null;
  job_level_id: UUID | null;
  position_id: UUID | null;
  leader_id: UUID | null;
  is_leader: boolean;
  notes: string | null;
}
