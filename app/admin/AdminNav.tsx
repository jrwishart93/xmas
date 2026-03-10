"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, LayoutDashboard, Megaphone, Receipt, Shield, Users } from "lucide-react";

import styles from "@/app/admin/admin.module.css";

const NAV_ITEMS = [
  { href: "/admin/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/members/", label: "Members", icon: Users },
  { href: "/admin/banking/", label: "Banking", icon: Landmark },
  { href: "/admin/ledger/", label: "Ledger", icon: Receipt },
  { href: "/admin/settings/", label: "Settings", icon: Megaphone },
];

function normalize(pathname: string) {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export default function AdminNav() {
  const pathname = normalize(usePathname() || "/admin/");

  return (
    <nav className={styles.nav} aria-label="Admin sections">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === normalize(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon className={styles.navIcon} strokeWidth={1.8} />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <Link href="/app/dashboard/" className={styles.portalLink}>
        <Shield className={styles.navIcon} strokeWidth={1.8} />
        <span>Member Portal</span>
      </Link>
    </nav>
  );
}
