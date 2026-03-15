import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart2, BookOpen, BookOpenText, Clock3, Hash, Landmark, Scale, TrendingUp } from "lucide-react";

import HeroImage from "@/app/images/Hero-book-hammer.png";
import styles from "@/app/page.module.css";
import PublicSiteShell from "@/components/PublicSiteShell";
import { ACT_DOCUMENT, formatActDate, formatWholePounds, getActStats } from "@/lib/act";
import {
  SITE_DESCRIPTION,
  SITE_DISCLAIMER,
  SITE_FULL_TITLE,
  SITE_SOCIAL_IMAGE_PATH,
} from "@/lib/site";

const spotlightCards = [
  {
    title: "Searchable Act reference",
    body: "Review the full Act with clearer structure, deliberate hierarchy, and faster access to each section.",
  },
  {
    title: "Current contribution amounts",
    body: "See clause counts, standard amounts, and update dates in one place without relying on separate documents.",
  },
  {
    title: "Direct member access",
    body: "Move from the website into the member portal with the Act, fund information, and account access aligned in one place.",
  },
];

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "/",
    title: SITE_FULL_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_SOCIAL_IMAGE_PATH],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_FULL_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_SOCIAL_IMAGE_PATH],
  },
};

export default function HomePage() {
  const stats = getActStats();

  return (
    <PublicSiteShell active="home" contextLabel="Overview" footerNote={SITE_DISCLAIMER}>
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroMedia}>
            <Image
              src={HeroImage}
              alt="The Social Contributions Act book and gavel"
              fill
              priority
              className={styles.heroImage}
              sizes="(max-width: 900px) 100vw, 50vw"
            />
            <div className={styles.heroGlow} aria-hidden="true" />
          </div>

          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Act reference and member access</p>
            <h1 className={styles.title}>{ACT_DOCUMENT.title}</h1>
            <p className={styles.lede}>
              The website brings together the Act, current contribution amounts, and member access
              in one clear reference point. It is designed to make the framework easy to review and
              the member portal easy to reach.
            </p>

            <div className={styles.actions}>
              <Link href="/act" className={styles.primaryAction}>
                Read the Act
                <ArrowRight size={18} />
              </Link>
              <a href="/login/" className={styles.secondaryAction}>
                Open member portal
              </a>
            </div>

            <p className={styles.heroNote}>
              Last updated {formatActDate(ACT_DOCUMENT.lastUpdated)}. Standard amount adjustments
              apply after 3 days where set out in the Act.
            </p>
          </div>
        </section>

        <section className={styles.statsGrid} aria-label="Act summary">
          <article className={styles.statCard}>
            <div className={styles.statIcon} aria-hidden="true"><BookOpen size={18} /></div>
            <span className={styles.statLabel}>Published parts</span>
            <strong className={styles.statValue}>{stats.totalParts}</strong>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statIcon} aria-hidden="true"><Hash size={18} /></div>
            <span className={styles.statLabel}>Listed sections</span>
            <strong className={styles.statValue}>{stats.totalSections}</strong>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statIcon} aria-hidden="true"><TrendingUp size={18} /></div>
            <span className={styles.statLabel}>Highest standard contribution</span>
            <strong className={styles.statValue}>{formatWholePounds(stats.highestContribution)}</strong>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statIcon} aria-hidden="true"><BarChart2 size={18} /></div>
            <span className={styles.statLabel}>Average listed contribution</span>
            <strong className={styles.statValue}>
              {formatWholePounds(Number(stats.averageContribution.toFixed(2)))}
            </strong>
          </article>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>Website overview</p>
            <h2>What the website provides</h2>
          </div>

          <div className={styles.cardGrid}>
            {spotlightCards.map((card) => (
              <article key={card.title} className={styles.featureCard}>
                <div className={styles.featureIcon} aria-hidden="true">
                  <BookOpenText size={20} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>Key points</p>
            <h2>What the Act sets out clearly</h2>
          </div>

          <div className={styles.cardGrid}>
            <article className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <Scale size={20} />
              </div>
              <h3>Optional participation</h3>
              <p>Participation in Team Social Fund is optional and the application does not form part of any disciplinary or employment process.</p>
            </article>

            <article className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <Clock3 size={20} />
              </div>
              <h3>Consistent timing</h3>
              <p>Where an amount remains open after three days, the Act applies the standard adjustment recorded for that section.</p>
            </article>

            <article className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <Landmark size={20} />
              </div>
              <h3>Clear member access</h3>
              <p>The website provides the Act and current information first, with the member portal focused on notices, balances, and payments.</p>
            </article>
          </div>
        </section>
      </div>
    </PublicSiteShell>
  );
}
