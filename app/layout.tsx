import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { getCurrentUserContext } from '@/lib/auth/user-context';

export const metadata = {
  title: 'AMCOMPANY 인사진단',
  description: 'AMCOMPANY HR Evaluation System',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserContext();

  return (
    <html lang="ko">
      <body>
        {user ? (
          <>
            <Sidebar roles={user.roles} />
            <div className="min-h-screen lg:ml-64">
              <Header user={user} />
              <main className="p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
          </>
        ) : children}
      </body>
    </html>
  );
}
