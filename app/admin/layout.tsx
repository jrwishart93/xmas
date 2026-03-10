import type { ReactNode } from "react";
import type { Metadata } from "next";

import AdminNav from "@/app/admin/AdminNav";
import styles from "@/app/admin/admin.module.css";
import { requireAdminPageAccess } from "@/lib/adminAccess";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: `Admin | ${SITE_NAME}`,
    template: `%s | Admin | ${SITE_NAME}`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const admin = await requireAdminPageAccess();

  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Admin control panel</p>
            <h1 className={styles.headerTitle}>Team Social Fund Admin</h1>
            <p className={styles.headerLead}>
              Administrative controls are unlocked for {admin.displayName}.
            </p>
          </div>

          <div className={styles.sessionCard}>
            <span className={styles.sessionBadge}>Admin</span>
            <strong>{admin.displayName}</strong>
            <span>{admin.email || admin.uid}</span>
          </div>
        </header>

        <AdminNav />

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
