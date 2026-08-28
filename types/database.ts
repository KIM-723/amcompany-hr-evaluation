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
export interface EvaluationPeriodRecord {
  id: UUID;
  name: string;
  code: string | null;
  description: string | null;
  start_date: ISODate;
  end_date: ISODate;
  self_start_date: ISODate | null;
  self_end_date: ISODate | null;
  first_start_date: ISODate | null;
  first_end_date: ISODate | null;
  second_start_date: ISODate | null;
  second_end_date: ISODate | null;
  calibration_start_date: ISODate | null;
  calibration_end_date: ISODate | null;
  result_release_date: ISODate | null;
  status: EvaluationPeriodStatus;
  copied_from_id: UUID | null;
  activated_at: ISODateTime | null;
  closed_at: ISODateTime | null;
  settings: Record<string, unknown>;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface EvaluationAssignmentMasterRecord {
  id: UUID;
  period_id: UUID;
  employee_id: UUID;
  first_evaluator_id: UUID | null;
  second_evaluator_id: UUID | null;
  template_id: UUID;
  status: string;
  current_stage: string;
  snapshot_version: number;
  snapshot_created_at: ISODateTime | null;
  started_at: ISODateTime | null;
  assigned_at: ISODateTime;
  updated_at: ISODateTime;
}
