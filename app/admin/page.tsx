import Link from "next/link";
import { ArrowRight, Gavel, Landmark, Megaphone, Receipt, Users } from "lucide-react";

import styles from "@/app/admin/admin.module.css";
import { formatDateTime, formatMoney, getDashboardSummary } from "@/lib/adminData";

const cards = [
  {
    href: "/admin/members/",
    title: "Member Management",
    body: "Promote admins, disable accounts, and remove memberships.",
    icon: Users,
  },
  {
    href: "/app/issue/",
    title: "Offence Management",
    body: "Issue SCNs and manage kangaroo court outcomes in the member portal.",
    icon: Gavel,
  },
  {
    href: "/admin/banking/",
    title: "Banking Integration",
    body: "Review Monzo connection status, refresh balances, and post manual adjustments.",
    icon: Landmark,
  },
  {
    href: "/admin/ledger/",
    title: "Reports and Ledger",
    body: "Review the fund ledger and export a CSV report.",
    icon: Receipt,
  },
  {
    href: "/admin/settings/",
    title: "Announcements",
    body: "Publish admin notices and keep the team informed.",
    icon: Megaphone,
  },
];

export default async function AdminDashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className={styles.pageStack}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Admin dashboard</p>
          <h2 className={styles.pageTitle}>Operational overview</h2>
          <p className={styles.pageLead}>
            Fund controls, member access, accusation flow, and bank status are consolidated here.
          </p>
        </div>
      </section>

      <section className={styles.metricGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Team Fund Balance</span>
          <strong className={styles.metricValue}>{formatMoney(summary.confirmedBalancePence)}</strong>
          <p className={styles.metricMeta}>
            Pending contributions: {formatMoney(summary.pendingBalancePence)}
          </p>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Members</span>
          <strong className={styles.metricValue}>{summary.memberCount}</strong>
          <p className={styles.metricMeta}>
            {summary.adminCount} admins, {summary.disabledCount} disabled accounts
          </p>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Pending Accusations</span>
          <strong className={styles.metricValue}>{summary.pendingAccusationCount}</strong>
          <p className={styles.metricMeta}>Awaiting plea or court outcome</p>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Bank Status</span>
          <strong className={styles.metricValueSmall}>
            {summary.bankConnected ? summary.bankAccountDisplayName || "Connected" : "Not connected"}
          </strong>
          <p className={styles.metricMeta}>
            {summary.bankConnected
              ? `Last updated ${formatDateTime(summary.bankLastUpdated)}`
              : "TrueLayer / Monzo consent still required."}
          </p>
        </article>
      </section>

      <section className={styles.cardGrid}>
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link key={card.href} href={card.href} className={styles.linkCard}>
              <div className={styles.linkCardHead}>
                <span className={styles.iconBadge}>
                  <Icon strokeWidth={1.8} />
                </span>
                <ArrowRight className={styles.linkArrow} strokeWidth={1.8} />
              </div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </Link>
          );
        })}
      </section>

      <section className={styles.dualGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.eyebrow}>Recent ledger</p>
              <h3>Latest adjustment</h3>
            </div>
            <Link href="/admin/ledger/" className={styles.inlineLink}>
              Open ledger
            </Link>
          </div>

          {summary.latestLedgerEntry ? (
            <div className={styles.activityCard}>
              <strong>{summary.latestLedgerEntry.type}</strong>
              <span>{formatMoney(summary.latestLedgerEntry.amountPence)}</span>
              <p>{summary.latestLedgerEntry.note || "No note recorded."}</p>
              <small>{formatDateTime(summary.latestLedgerEntry.createdAt)}</small>
            </div>
          ) : (
            <p className={styles.emptyState}>No fund ledger entries have been recorded yet.</p>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.eyebrow}>Announcements</p>
              <h3>Team notices</h3>
            </div>
            <Link href="/admin/settings/" className={styles.inlineLink}>
              Publish notice
            </Link>
          </div>

          <div className={styles.activityCard}>
            <strong>{summary.announcementCount} announcement{summary.announcementCount === 1 ? "" : "s"}</strong>
            <p>Use the settings page to publish operational notices to the team.</p>
            <small>Announcement support is ready for the next member-facing surface.</small>
          </div>
        </article>
      </section>
    </div>
  );
}
