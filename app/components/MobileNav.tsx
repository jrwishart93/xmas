"use client";

import Link from "next/link";
import { Scale, ScrollText, User } from "lucide-react";
import { usePathname } from "next/navigation";

import styles from "@/app/components/MobileNav.module.css";
import { PUBLIC_NAV_ITEMS, getPublicActiveSection } from "@/js/nav-config.js";

const ICONS = {
  scale: Scale,
  "scroll-text": ScrollText,
  user: User,
};

type MobileNavProps = {
  active?: string | null;
};

export default function MobileNav({ active }: MobileNavProps) {
  const pathname = usePathname();
  const activeSection = active ?? getPublicActiveSection(pathname);

  return (
    <nav className={styles.nav} aria-label="Mobile primary navigation">
      {PUBLIC_NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon];
        const isActive = item.id === activeSection;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={`${styles.link} ${isActive ? styles.linkActive : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className={styles.linkIcon} strokeWidth={1.8} />
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
