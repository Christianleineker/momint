import { Sidebar } from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* TODO: contador vindo de /api/auth/me */}
      <Sidebar pendentes={4} />
      <main className="min-w-0 flex-1 px-4 py-7 sm:px-8">{children}</main>
    </div>
  );
}
