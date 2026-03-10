"use client";

import Link from "next/link";
import { Home, BookOpen, LayoutDashboard, User } from "lucide-react";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/act", label: "The Act", icon: BookOpen },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/login", label: "Account", icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[1000] flex h-[70px] items-center justify-around border-t border-white/10 bg-[rgba(10,15,30,0.8)] pb-[env(safe-area-inset-bottom)] backdrop-blur-[14px] md:hidden"
      aria-label="Mobile"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active =
          pathname === tab.href ||
          (tab.href !== "/" && pathname.startsWith(`${tab.href}/`));

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-1 text-[11px] transition-colors ${
              active ? "text-white" : "text-white/60"
            }`}
          >
            <Icon size={22} className="opacity-90" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
