import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({
  title,
  kicker,
  children,
  brandIcon,
  headerCenter,
  actions,
  pageClassName,
  contentClassName,
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
  brandIcon?: ReactNode;
  headerCenter?: ReactNode;
  actions?: ReactNode;
  pageClassName?: string;
  contentClassName?: string;
}) {
  return (
    <main className={["shell-page", pageClassName].filter(Boolean).join(" ")}>
      <div className="shell-frame">
        <header className="shell-header">
          <div className="shell-brand">
            {brandIcon ? <span className="shell-brand-icon">{brandIcon}</span> : null}
            {kicker ? <span className="shell-kicker">{kicker}</span> : null}
            <Link href="/" className="shell-title">
              {title}
            </Link>
          </div>
          {headerCenter ? <div className="shell-header-center">{headerCenter}</div> : null}
          {actions}
        </header>
        <div className={["shell-content", contentClassName].filter(Boolean).join(" ")}>{children}</div>
      </div>
    </main>
  );
}
