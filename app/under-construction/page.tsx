import type { Metadata } from "next";
import Link from "next/link";
import { Hammer, ShieldCheck } from "lucide-react";

import styles from "@/app/under-construction/page.module.css";
import PublicSiteShell from "@/components/PublicSiteShell";

export const metadata: Metadata = {
  title: "Under Construction",
  description: "This route remains part of the existing member application and is not ready for indexing.",
  alternates: {
    canonical: "/under-construction/",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function UnderConstructionPage() {
  return (
    <PublicSiteShell active={null} contextLabel="Site update">
      <section className={styles.card}>
        <div className={styles.iconWrap}>
          <Hammer size={28} />
        </div>
        <p className={styles.kicker}>Site update</p>
        <h1>Feature unavailable</h1>
        <p className={styles.copy}>
          This route remains part of the existing member application and is still being updated.
          The current website pages are available now, while this area stays on the existing
          workflow until the next update is ready.
        </p>

        <div className={styles.note}>
          <ShieldCheck size={18} />
          <span>The signed-in workflow has not been removed. This route has been held back to avoid disrupting the existing service.</span>
        </div>

        <div className={styles.actions}>
          <Link href="/" className={styles.primaryAction}>
            Back to website
          </Link>
          <Link href="/act" className={styles.secondaryAction}>
            View the Act
          </Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
