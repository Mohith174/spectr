import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user || user.publicMetadata?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-bg text-primary font-mono flex flex-col">
      <div className="scanlines" />

      <header className="border-b border-border px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-bold text-sm tracking-[0.2em] uppercase hover:text-sub transition-colors"
            >
              SPECTR
            </Link>
            <span className="text-muted">|</span>
            <span className="text-muted text-xs tracking-widest uppercase">Admin</span>
          </div>
          <nav className="flex items-center gap-4 text-xs">
            <Link href="/admin" className="text-sub hover:text-primary transition-colors">
              Dashboard
            </Link>
            <Link href="/dashboard" className="text-sub hover:text-primary transition-colors">
              Terminal →
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {children}
      </main>

      <footer className="border-t border-border px-6 py-3 text-center text-muted text-xs">
        SPECTR ADMIN — INTERNAL USE ONLY
      </footer>
    </div>
  );
}
