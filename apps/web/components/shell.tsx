import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({
  title,
  kicker,
  children,
  actions,
  pageClassName,
  contentClassName,
}: {
  title: string;
  kicker: string;
  children: ReactNode;
  actions?: ReactNode;
  pageClassName?: string;
  contentClassName?: string;
}) {
  return (
    <main className={["shell-page", pageClassName].filter(Boolean).join(" ")}>
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
        <div className={["shell-content", contentClassName].filter(Boolean).join(" ")}>{children}</div>
      </div>
    </main>
  );
}
