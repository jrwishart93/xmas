import Image from "next/image";
import { BookCopy, Search, ShieldAlert } from "lucide-react";

import OpenBook from "@/app/images/Open-book.png";
import styles from "@/app/act/page.module.css";
import PublicSiteShell from "@/components/PublicSiteShell";
import PublicActExplorer from "@/components/act/PublicActExplorer";
import { ACT_DOCUMENT, formatActDate, getActStats } from "@/lib/act";

export default function ActPage() {
  const stats = getActStats();

  return (
    <PublicSiteShell active="act" contextLabel="Public rulebook">
      <div className={styles.page}>
        <section className={styles.hero}>
          <Image
            src={OpenBook}
            alt="Open rulebook"
            fill
            priority
            className={styles.heroImage}
            sizes="100vw"
          />
          <div className={styles.heroOverlay} aria-hidden="true" />

          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Public rulebook</p>
            <h1>{ACT_DOCUMENT.title}</h1>
            <p className={styles.summary}>
              Browse every published part and clause in the 2025 act. Search by code, title, or
              phrase and scan the standard contribution amounts without signing in.
            </p>

            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <BookCopy size={18} />
                <span>{stats.totalParts} parts, {stats.totalSections} sections</span>
              </div>
              <div className={styles.metaItem}>
                <Search size={18} />
                <span>Search by section code, title, or text</span>
              </div>
              <div className={styles.metaItem}>
                <ShieldAlert size={18} />
                <span>Updated {formatActDate(ACT_DOCUMENT.lastUpdated)}</span>
              </div>
            </div>
          </div>
        </section>

        <PublicActExplorer document={ACT_DOCUMENT} />
      </div>
    </PublicSiteShell>
  );
}
