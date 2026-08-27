import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
export const metadata={title:'AMCOMPANY 인사진단',description:'AMCOMPANY HR Evaluation System'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body><Sidebar/><div className="ml-64 min-h-screen"><Header/><main className="p-8">{children}</main></div></body></html>}
