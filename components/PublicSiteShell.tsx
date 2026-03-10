import type { ReactNode } from "react";
import Link from "next/link";

import MobileNav from "@/app/components/MobileNav";
import styles from "@/components/PublicSiteShell.module.css";
import { PUBLIC_NAV_ITEMS } from "@/js/nav-config.js";

type PublicSiteShellProps = {
  active?: "home" | "act" | null;
  contextLabel?: string;
  children: ReactNode;
};

export default function PublicSiteShell({
  active = "home",
  contextLabel,
  children,
}: PublicSiteShellProps) {
  const activeItem = PUBLIC_NAV_ITEMS.find((item) => item.id === active) || null;
  const mobileContext = contextLabel || activeItem?.label || "Public pages";

  return (
    <div className={styles.shell}>
      <header className={styles.headerWrap}>
        <div className={styles.header}>
          <div className={styles.headerIdentity}>
            <Link href="/" className={styles.brand}>
              <span className={styles.brandMark} aria-hidden="true">
                SJ
              </span>
              <span>
                <strong>Summary Justice Act</strong>
                <small>Social Contributions 2025</small>
              </span>
            </Link>
            <p className={styles.contextPill}>{mobileContext}</p>
          </div>

          <nav className={styles.nav} aria-label="Primary">
            {PUBLIC_NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`${item.id === "portal" ? styles.portalLink : styles.navLink} ${
                  item.id === active ? styles.navLinkActive : ""
                }`}
                aria-current={item.id === active ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <p>
          Private team contribution system. Voluntary participation only. This is an informal
          team social framework, not a real disciplinary process.
        </p>
      </footer>

      <MobileNav active={active} />
    </div>
  );
}
