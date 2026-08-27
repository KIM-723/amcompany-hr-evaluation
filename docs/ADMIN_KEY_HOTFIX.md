# Supabase Admin Key Hotfix

`createAdminClient()` now supports both:

- `SUPABASE_SECRET_KEY` (recommended, current Supabase key format)
- `SUPABASE_SERVICE_ROLE_KEY` (legacy fallback)

No client-side exposure is introduced. Both variables remain server-only.
