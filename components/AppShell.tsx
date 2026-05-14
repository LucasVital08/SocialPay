import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

interface AppShellProps {
  children: React.ReactNode;
  userName?: string;
  userHandle?: string;
}

export function AppShell({ children, userName, userHandle }: AppShellProps) {
  return (
    <div className="flex h-full min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar userName={userName} userHandle={userHandle} />
        <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
