import type { Metadata } from "next";
import Image from "next/image";
import { BookCopy, Search, ShieldAlert } from "lucide-react";

import OpenBook from "@/app/images/Open-book.png";
import styles from "@/app/act/page.module.css";
import PublicSiteShell from "@/components/PublicSiteShell";
import PublicActExplorer from "@/components/act/PublicActExplorer";
import { ACT_DOCUMENT, formatActDate, getActStats } from "@/lib/act";
import { SITE_DISCLAIMER, SITE_NAME } from "@/lib/site";

const ACT_PAGE_DESCRIPTION =
  "Review every part and clause of The Social Contributions Act 2025, with searchable sections and current contribution amounts.";

export const metadata: Metadata = {
  title: "The Act",
  description: ACT_PAGE_DESCRIPTION,
  alternates: {
    canonical: "/act/",
  },
  openGraph: {
    url: "/act/",
    title: `The Act | ${SITE_NAME}`,
    description: ACT_PAGE_DESCRIPTION,
  },
  twitter: {
    title: `The Act | ${SITE_NAME}`,
    description: ACT_PAGE_DESCRIPTION,
  },
};

export default function ActPage() {
  const stats = getActStats();

  return (
    <PublicSiteShell active="act" contextLabel="The Act" footerNote={SITE_DISCLAIMER}>
      <div className={styles.page}>
        <section className={styles.hero}>
          <Image
            src={OpenBook}
            alt="Open Act document"
            fill
            priority
            className={styles.heroImage}
            sizes="100vw"
          />
          <div className={styles.heroOverlay} aria-hidden="true" />

          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Act reference</p>
            <h1>{ACT_DOCUMENT.title}</h1>
            <p className={styles.summary}>
              Review every part and clause in the 2025 Act. Search by code, title, or wording and
              check the standard contribution amounts in one place.
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
