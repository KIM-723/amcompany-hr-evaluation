import { LoginForm } from '@/app/login/LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const supabaseKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ''
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <LoginForm
        demoMode={demoMode}
        supabaseUrl={supabaseUrl}
        supabaseKey={supabaseKey}
      />
    </div>
  );
}
