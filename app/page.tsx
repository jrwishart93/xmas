import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpenText, Clock3, Landmark, Scale } from "lucide-react";

import HeroImage from "@/app/images/Hero-book-hammer.png";
import styles from "@/app/page.module.css";
import PublicSiteShell from "@/components/PublicSiteShell";
import { ACT_DOCUMENT, formatActDate, formatWholePounds, getActStats } from "@/lib/act";

const spotlightCards = [
  {
    title: "Searchable public rulebook",
    body: "Browse the published framework with a clearer reading order, more deliberate hierarchy, and better mobile spacing.",
  },
  {
    title: "Published amounts in one place",
    body: "See the current clause counts, standard contributions, and update date without signing in or hunting through separate files.",
  },
  {
    title: "Clearer handoff to members",
    body: "The public side explains the structure first so the member area can stay focused on live balances, notices, and payment actions.",
  },
];

export default function HomePage() {
  const stats = getActStats();

  return (
    <PublicSiteShell active="home" contextLabel="Public overview">
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroMedia}>
            <Image
              src={HeroImage}
              alt="Summary Justice Act book and gavel"
              fill
              priority
              className={styles.heroImage}
              sizes="(max-width: 900px) 100vw, 50vw"
            />
            <div className={styles.heroGlow} aria-hidden="true" />
          </div>

          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Private team rulebook, rebuilt for a cleaner public front door</p>
            <h1 className={styles.title}>{ACT_DOCUMENT.title}</h1>
            <p className={styles.lede}>
              A structured, tongue-in-cheek contribution framework presented as a cleaner public
              reference. The aim is simple: make the act readable, searchable, and quick to scan
              before members move into the portal.
            </p>

            <div className={styles.actions}>
              <Link href="/act" className={styles.primaryAction}>
                Read the Act
                <ArrowRight size={18} />
              </Link>
              <a href="/login/" className={styles.secondaryAction}>
                Member sign in
              </a>
            </div>

            <p className={styles.heroNote}>
              Last updated {formatActDate(ACT_DOCUMENT.lastUpdated)}. Standard late penalty doubles
              after 3 days.
            </p>
          </div>
        </section>

        <section className={styles.statsGrid} aria-label="Act summary">
          <article className={styles.statCard}>
            <span className={styles.statLabel}>Published parts</span>
            <strong className={styles.statValue}>{stats.totalParts}</strong>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statLabel}>Listed sections</span>
            <strong className={styles.statValue}>{stats.totalSections}</strong>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statLabel}>Highest standard contribution</span>
            <strong className={styles.statValue}>{formatWholePounds(stats.highestContribution)}</strong>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statLabel}>Average listed contribution</span>
            <strong className={styles.statValue}>
              {formatWholePounds(Number(stats.averageContribution.toFixed(2)))}
            </strong>
          </article>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>Public overview</p>
            <h2>What the act communicates before anyone signs in</h2>
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
            <p className={styles.sectionKicker}>At a glance</p>
            <h2>What the rulebook still communicates clearly</h2>
          </div>

          <div className={styles.cardGrid}>
            <article className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <Scale size={20} />
              </div>
              <h3>Voluntary participation</h3>
              <p>This remains a private social system with a deliberately formal tone, not an actual court or disciplinary process.</p>
            </article>

            <article className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <Clock3 size={20} />
              </div>
              <h3>Consistent penalty window</h3>
              <p>Every listed clause carries the same three-day late-penalty threshold, which keeps expectations easy to understand.</p>
            </article>

            <article className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <Landmark size={20} />
              </div>
              <h3>Better handoff to members</h3>
              <p>The public view does the explanation work up front so the member portal can stay focused on transactions and workflow.</p>
            </article>
          </div>
        </section>
      </div>
    </PublicSiteShell>
  );
}
