import { LoginForm } from '@/app/login/LoginForm';

export default function LoginPage() {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <LoginForm demoMode={demoMode} />
    </div>
  );
}
