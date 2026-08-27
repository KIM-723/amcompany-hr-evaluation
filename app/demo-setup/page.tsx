import { DemoSetupClient } from '@/app/demo-setup/DemoSetupClient';

export default function DemoSetupPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <DemoSetupClient enabled={process.env.DEMO_SETUP_ENABLED === 'true'} />
    </div>
  );
}
