import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({
  title,
  kicker,
  children,
  actions,
}: {
  title: string;
  kicker: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <main className="shell-page">
      <div className="shell-frame">
        <header className="shell-header">
          <div className="shell-brand">
            <span className="shell-kicker">{kicker}</span>
            <Link href="/" className="shell-title">
              {title}
            </Link>
          </div>
          {actions}
        </header>
        <div className="shell-content">{children}</div>
      </div>
    </main>
  );
}
