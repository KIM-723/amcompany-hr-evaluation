export type Role = 'employee'|'first_evaluator'|'second_evaluator'|'leader'|'hr_admin'|'super_admin';
export type EvaluationStatus = 'not_started'|'self_in_progress'|'self_submitted'|'first_in_progress'|'first_submitted'|'second_review'|'calibration'|'finalized';
export interface Employee { id:string; employeeNo:string; name:string; department:string; jobLevel:string; position:string; status:string; }
