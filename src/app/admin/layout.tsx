import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "◈" },
  { href: "/admin/requests", label: "Requests", icon: "≡" },
  { href: "/admin/stream-session/current", label: "Stream", icon: "◉" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-arena-border bg-arena-surface flex flex-col">
        <div className="p-4 border-b border-arena-border">
          <h1 className="font-mono font-bold text-arena-accent text-lg tracking-tight">
            LIVE BUILD<br />
            <span className="text-white">ARENA</span>
          </h1>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                "text-arena-muted hover:text-white hover:bg-arena-border"
              )}
            >
              <span className="font-mono text-base w-5 text-center">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-arena-border space-y-2">
          <a
            href="/overlay/queue"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-xs text-center text-arena-muted hover:text-arena-accent py-1.5 px-3 border border-arena-border rounded-lg transition-colors"
          >
            Queue Overlay ↗
          </a>
          <a
            href="/overlay/current-build"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-xs text-center text-arena-muted hover:text-arena-accent py-1.5 px-3 border border-arena-border rounded-lg transition-colors"
          >
            Build Overlay ↗
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
