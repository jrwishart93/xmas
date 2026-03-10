import Link from "next/link";
import { Hammer, ShieldCheck } from "lucide-react";

import styles from "@/app/under-construction/page.module.css";
import PublicSiteShell from "@/components/PublicSiteShell";

export default function UnderConstructionPage() {
  return (
    <PublicSiteShell active={null} contextLabel="Preview route">
      <section className={styles.card}>
        <div className={styles.iconWrap}>
          <Hammer size={28} />
        </div>
        <p className={styles.kicker}>Preview route</p>
        <h1>Feature under construction</h1>
        <p className={styles.copy}>
          That route is still part of the older member application. The public-facing React pages
          have been modernised first, while the signed-in workflow is left intact until the next
          migration pass.
        </p>

        <div className={styles.note}>
          <ShieldCheck size={18} />
          <span>The existing member workflow has not been removed; it has been kept out of this pass to avoid regressions.</span>
        </div>

        <div className={styles.actions}>
          <Link href="/" className={styles.primaryAction}>
            Back to home
          </Link>
          <Link href="/act" className={styles.secondaryAction}>
            Open the Act
          </Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
