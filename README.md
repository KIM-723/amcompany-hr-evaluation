# AMCOMPANY HR Evaluation — STEP 3 Update

STEP 2가 적용된 프로젝트에 추가하는 **Sample Data 전용 업데이트 패키지**입니다.

## 적용 순서
1. 이 폴더의 `docs`, `supabase`, `README.md`를 GitHub 저장소 Root에 업로드합니다.
2. Supabase SQL Editor에서 `supabase/seed/002_step3_sample_data.sql` 전체를 실행합니다.
3. 이어서 `supabase/seed/003_step3_validation.sql`을 실행해 데이터 개수를 확인합니다.
4. STEP 4 전까지 Auth Demo Account는 만들지 않습니다.

## 중요한 주의사항
- `001_initial_schema.sql` 및 `002_step2_schema_hardening.sql`이 먼저 적용되어 있어야 합니다.
- 기존 `001_demo_seed.sql`은 초기 골격 제작 당시의 최소 Seed입니다. STEP 3에서는 **002_step3_sample_data.sql을 기준**으로 사용합니다.
- 개발용 Sample Data이며 실제 인사 운영 DB에 넣지 마세요.
