import type { ReactNode } from "react";
import Link from "next/link";

import MobileNav from "@/app/components/MobileNav";
import Image from "next/image";
import BrandLogo from "@/app/images/logo-image-no-background.png";
import styles from "@/components/PublicSiteShell.module.css";
import { PUBLIC_NAV_ITEMS } from "@/js/nav-config.js";

type PublicSiteShellProps = {
  active?: "home" | "act" | null;
  contextLabel?: string;
  footerNote?: string;
  children: ReactNode;
};

export default function PublicSiteShell({
  active = "home",
  contextLabel,
  footerNote,
  children,
}: PublicSiteShellProps) {
  const activeItem = PUBLIC_NAV_ITEMS.find((item) => item.id === active) || null;
  const mobileContext = contextLabel || activeItem?.label || "Website";

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>
      <header className={styles.headerWrap}>
        <div className={styles.header}>
          <div className={styles.headerIdentity}>
            <Link href="/" className={styles.brand} aria-label="The Social Contributions Act home">
              <span className={styles.brandMark}>
                <Image
                  src={BrandLogo}
                  alt="The Social Contributions Act Team Social Fund"
                  className={styles.brandLogo}
                  sizes="(max-width: 767px) 132px, 164px"
                  priority
                />
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

      <main id="main-content" className={styles.main}>{children}</main>

      {footerNote ? (
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <p>{footerNote}</p>
          </div>
        </footer>
      ) : null}

      <MobileNav active={active} />
    </div>
  );
}
