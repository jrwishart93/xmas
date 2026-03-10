import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Gavel, Landmark, Megaphone, Receipt, Users } from "lucide-react";

import {
  changeMemberRoleAction,
  createAnnouncementAction,
  createManualAdjustmentAction,
  removeMemberAction,
  toggleMemberDisabledAction,
} from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.css";
import {
  formatDateTime,
  formatMoney,
  getDashboardSummary,
  getBankingSummary,
  listLedgerEntries,
  listMembers,
  listAnnouncements,
} from "@/lib/adminData";
import { requireAdminPageAccess } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type PageProps = {
  params: Promise<{ slug?: string[] }>;
  searchParams: SearchParams;
};

const SECTIONS = ["banking", "ledger", "members", "settings"] as const;
type Section = (typeof SECTIONS)[number] | "dashboard";

const TITLES: Record<Section, string> = {
  dashboard: "Dashboard",
  banking: "Banking",
  ledger: "Ledger",
  members: "Members",
  settings: "Settings",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const key = slug?.[0] as Section | undefined;
  return { title: key && key in TITLES ? TITLES[key] : TITLES.dashboard };
}

function readMessage(params: Record<string, string | string[] | undefined>) {
  const success = typeof params.success === "string" ? params.success : "";
  const error = typeof params.error === "string" ? params.error : "";
  return success
    ? { type: "success" as const, text: success }
    : error
      ? { type: "error" as const, text: error }
      : null;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

const dashCards = [
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

async function DashboardSection() {
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
            {summary.bankConnected
              ? summary.bankAccountDisplayName || "Connected"
              : "Not connected"}
          </strong>
          <p className={styles.metricMeta}>
            {summary.bankConnected
              ? `Last updated ${formatDateTime(summary.bankLastUpdated)}`
              : "TrueLayer / Monzo consent still required."}
          </p>
        </article>
      </section>

      <section className={styles.cardGrid}>
        {dashCards.map((card) => {
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
            <strong>
              {summary.announcementCount} announcement
              {summary.announcementCount === 1 ? "" : "s"}
            </strong>
            <p>Use the settings page to publish operational notices to the team.</p>
            <small>Announcement support is ready for the next member-facing surface.</small>
          </div>
        </article>
      </section>
    </div>
  );
}

// ── Banking ────────────────────────────────────────────────────────────────

function formatLiveBalance(value: number | null, currency = "GBP") {
  if (value === null) return "--";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
}

async function BankingSection({ searchParams }: { searchParams: SearchParams }) {
  const [banking, params] = await Promise.all([getBankingSummary(), searchParams]);
  const message = readMessage(params);
  return (
    <div className={styles.pageStack}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Banking control panel</p>
          <h2 className={styles.pageTitle}>Monzo connection and fund balance controls</h2>
          <p className={styles.pageLead}>
            Connect TrueLayer, review the live bank balance, and apply manual fund adjustments.
          </p>
        </div>
      </section>

      {message ? (
        <p
          className={`${styles.message} ${message.type === "error" ? styles.messageError : styles.messageSuccess}`}
        >
          {message.text}
        </p>
      ) : null}

      <section className={styles.metricGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Connected Bank</span>
          <strong className={styles.metricValueSmall}>
            {banking.provider
              ? `${banking.provider} · ${banking.accountDisplayName || "Account"}`
              : "Not connected"}
          </strong>
          <p className={styles.metricMeta}>Connected at {formatDateTime(banking.connectedAt)}</p>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Live Bank Balance</span>
          <strong className={styles.metricValueSmall}>
            {formatLiveBalance(banking.liveBalance, banking.currency)}
          </strong>
          <p className={styles.metricMeta}>
            Last updated {formatDateTime(banking.liveBalanceUpdatedAt || banking.lastUpdated)}
          </p>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Recorded Fund Total</span>
          <strong className={styles.metricValue}>{formatMoney(banking.confirmedBalancePence)}</strong>
          <p className={styles.metricMeta}>
            Pending contributions {formatMoney(banking.pendingBalancePence)}
          </p>
        </article>
      </section>

      <section className={styles.dualGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.eyebrow}>Connection</p>
              <h3>TrueLayer / Monzo</h3>
            </div>
          </div>
          <div className={styles.stack}>
            <p className={styles.panelMeta}>
              Redirect URI:{" "}
              <span className={styles.mono}>{banking.settings.redirectUri}</span>
            </p>
            {banking.liveBalanceError ? (
              <p className={`${styles.message} ${styles.messageError}`}>
                {banking.liveBalanceError}
              </p>
            ) : null}
            <div className={styles.buttonRow}>
              <Link href="/api/admin/banking-connect" className={styles.primaryButton}>
                {banking.provider ? "Reconnect Bank" : "Connect Bank"}
              </Link>
              <Link href="/admin/banking/" className={styles.secondaryButton}>
                Refresh Balance
              </Link>
            </div>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.eyebrow}>Manual adjustment</p>
              <h3>Adjust fund total</h3>
            </div>
          </div>
          <form action={createManualAdjustmentAction} className={styles.formGrid}>
            <input type="hidden" name="returnTo" value="/admin/banking/" />
            <label className={styles.field}>
              <span>Amount</span>
              <input
                type="text"
                name="amount"
                inputMode="decimal"
                placeholder="e.g. 12.50 or -5.00"
                className={styles.input}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Reason</span>
              <textarea
                name="note"
                rows={4}
                placeholder="Explain why the fund total is being adjusted."
                className={styles.textarea}
                required
              />
            </label>
            <button type="submit" className={styles.primaryButton}>
              Record adjustment
            </button>
          </form>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <p className={styles.eyebrow}>Recent fund transactions</p>
            <h3>Latest ledger activity</h3>
          </div>
          <p className={styles.panelMeta}>
            Recent bank transactions are represented through the fund ledger in this phase.
          </p>
        </div>
        {banking.recentLedger.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Reference</th>
                  <th>Created By</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {banking.recentLedger.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.type}</td>
                    <td>{formatMoney(entry.amountPence)}</td>
                    <td>{entry.note || entry.offenceCode || entry.userId || "No reference"}</td>
                    <td>{entry.createdBy || "System"}</td>
                    <td>{formatDateTime(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.emptyState}>No ledger activity has been recorded yet.</p>
        )}
      </section>
    </div>
  );
}

// ── Ledger ─────────────────────────────────────────────────────────────────

async function LedgerSection({ searchParams }: { searchParams: SearchParams }) {
  const [entries, params] = await Promise.all([listLedgerEntries(100), searchParams]);
  const message = readMessage(params);
  return (
    <div className={styles.pageStack}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Fund ledger</p>
          <h2 className={styles.pageTitle}>Record, review, and export ledger entries</h2>
          <p className={styles.pageLead}>
            Every manual adjustment, fine, or payment entry should land here for reporting.
          </p>
        </div>
      </section>

      {message ? (
        <p
          className={`${styles.message} ${message.type === "error" ? styles.messageError : styles.messageSuccess}`}
        >
          {message.text}
        </p>
      ) : null}

      <section className={styles.dualGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.eyebrow}>Manual entry</p>
              <h3>Add ledger adjustment</h3>
            </div>
          </div>
          <form action={createManualAdjustmentAction} className={styles.formGrid}>
            <input type="hidden" name="returnTo" value="/admin/ledger/" />
            <label className={styles.field}>
              <span>Amount</span>
              <input
                type="text"
                name="amount"
                inputMode="decimal"
                placeholder="e.g. 5.00 or -2.50"
                className={styles.input}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Note</span>
              <textarea
                name="note"
                rows={4}
                placeholder="Describe the adjustment, correction, or payment."
                className={styles.textarea}
                required
              />
            </label>
            <button type="submit" className={styles.primaryButton}>
              Add entry
            </button>
          </form>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.eyebrow}>Export</p>
              <h3>Download report</h3>
            </div>
          </div>
          <p className={styles.panelMeta}>
            Export the current fund ledger to CSV for offline reporting or audit review.
          </p>
          <div className={styles.buttonRow}>
            <Link href="/api/admin/ledger-export" className={styles.secondaryButton}>
              Export CSV
            </Link>
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <p className={styles.eyebrow}>Ledger entries</p>
            <h3>{entries.length} recent records</h3>
          </div>
        </div>
        {entries.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>User</th>
                  <th>Offence Code</th>
                  <th>Created By</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.createdAt)}</td>
                    <td>{entry.type}</td>
                    <td>{formatMoney(entry.amountPence)}</td>
                    <td>{entry.userId || "—"}</td>
                    <td>{entry.offenceCode || "—"}</td>
                    <td>{entry.createdBy || "System"}</td>
                    <td>{entry.note || "No note recorded."}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.emptyState}>No ledger entries have been recorded yet.</p>
        )}
      </section>
    </div>
  );
}

// ── Members ────────────────────────────────────────────────────────────────

async function MembersSection({ searchParams }: { searchParams: SearchParams }) {
  const [admin, members, params] = await Promise.all([
    requireAdminPageAccess(),
    listMembers(),
    searchParams,
  ]);
  const message = readMessage(params);
  return (
    <div className={styles.pageStack}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Member management</p>
          <h2 className={styles.pageTitle}>Roles, removals, and account status</h2>
          <p className={styles.pageLead}>
            Review every team member, promote admins, remove memberships, and disable accounts.
          </p>
        </div>
      </section>

      {message ? (
        <p
          className={`${styles.message} ${message.type === "error" ? styles.messageError : styles.messageSuccess}`}
        >
          {message.text}
        </p>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <p className={styles.eyebrow}>Directory</p>
            <h3>{members.length} active records</h3>
          </div>
          <p className={styles.panelMeta}>
            You cannot demote, disable, or remove your own admin record here.
          </p>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isCurrentUser = member.uid === admin.uid;
                const roleClass =
                  member.role === "admin" ? styles.badgeAdmin : styles.badgeMember;
                return (
                  <tr key={member.uid}>
                    <td>
                      <strong>{member.displayName}</strong>
                      <div className={styles.rowMeta}>{member.uid}</div>
                    </td>
                    <td>{member.email || "No email recorded"}</td>
                    <td>
                      <span className={`${styles.badge} ${roleClass}`}>{member.role}</span>
                    </td>
                    <td>
                      {member.disabled ? (
                        <span className={`${styles.badge} ${styles.badgeDisabled}`}>
                          Disabled
                        </span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeLive}`}>Active</span>
                      )}
                    </td>
                    <td>{formatDateTime(member.createdAt)}</td>
                    <td>{formatDateTime(member.updatedAt)}</td>
                    <td>
                      <div className={styles.actionGroup}>
                        {member.role === "admin" ? null : (
                          <form action={changeMemberRoleAction} className={styles.inlineForm}>
                            <input type="hidden" name="targetUid" value={member.uid} />
                            <input type="hidden" name="role" value="admin" />
                            <input type="hidden" name="returnTo" value="/admin/members/" />
                            <button type="submit" className={styles.secondaryButton}>
                              Promote to Admin
                            </button>
                          </form>
                        )}

                        {member.role === "admin" && !isCurrentUser ? (
                          <form action={changeMemberRoleAction} className={styles.inlineForm}>
                            <input type="hidden" name="targetUid" value={member.uid} />
                            <input type="hidden" name="role" value="member" />
                            <input type="hidden" name="returnTo" value="/admin/members/" />
                            <button type="submit" className={styles.secondaryButton}>
                              Demote to Member
                            </button>
                          </form>
                        ) : null}

                        {!isCurrentUser ? (
                          <form
                            action={toggleMemberDisabledAction}
                            className={styles.inlineForm}
                          >
                            <input type="hidden" name="targetUid" value={member.uid} />
                            <input
                              type="hidden"
                              name="disabled"
                              value={member.disabled ? "false" : "true"}
                            />
                            <input type="hidden" name="returnTo" value="/admin/members/" />
                            <button type="submit" className={styles.secondaryButton}>
                              {member.disabled ? "Enable User" : "Disable User"}
                            </button>
                          </form>
                        ) : null}

                        {!isCurrentUser ? (
                          <form action={removeMemberAction} className={styles.inlineForm}>
                            <input type="hidden" name="targetUid" value={member.uid} />
                            <input type="hidden" name="returnTo" value="/admin/members/" />
                            <button type="submit" className={styles.dangerButton}>
                              Remove
                            </button>
                          </form>
                        ) : (
                          <span className={styles.panelMeta}>Current admin</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ── Settings ───────────────────────────────────────────────────────────────

async function SettingsSection({ searchParams }: { searchParams: SearchParams }) {
  const [announcements, params] = await Promise.all([listAnnouncements(12), searchParams]);
  const message = readMessage(params);
  return (
    <div className={styles.pageStack}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Admin settings</p>
          <h2 className={styles.pageTitle}>Announcements and admin account setup</h2>
          <p className={styles.pageLead}>
            Publish operational notices and keep the dedicated admin account process explicit.
          </p>
        </div>
      </section>

      {message ? (
        <p
          className={`${styles.message} ${message.type === "error" ? styles.messageError : styles.messageSuccess}`}
        >
          {message.text}
        </p>
      ) : null}

      <section className={styles.dualGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.eyebrow}>Announcements</p>
              <h3>Publish notice</h3>
            </div>
          </div>
          <form action={createAnnouncementAction} className={styles.formGrid}>
            <input type="hidden" name="returnTo" value="/admin/settings/" />
            <label className={styles.field}>
              <span>Title</span>
              <input
                type="text"
                name="title"
                placeholder="e.g. Fund update"
                className={styles.input}
                maxLength={120}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Message</span>
              <textarea
                name="message"
                rows={6}
                placeholder="Write the announcement that should be stored for the team."
                className={styles.textarea}
                maxLength={1200}
                required
              />
            </label>
            <button type="submit" className={styles.primaryButton}>
              Publish announcement
            </button>
          </form>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.eyebrow}>Dedicated admin account</p>
              <h3>Recommended setup</h3>
            </div>
          </div>
          <div className={styles.stack}>
            <p className={styles.panelMeta}>
              Create a Firebase Auth user such as{" "}
              <span className={styles.mono}>admin@teamsocialfund.local</span>, then create the
              member document at{" "}
              <span className={styles.mono}>
                teams/rpu-social-fund/members/{"{uid}"}
              </span>{" "}
              with <span className={styles.mono}> role: &quot;admin&quot;</span>.
            </p>
            <p className={styles.panelMeta}>
              The admin route tree, ledger writes, member-management actions, and banking controls
              all depend on that Firestore role.
            </p>
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <p className={styles.eyebrow}>Recent notices</p>
            <h3>{announcements.length} stored announcements</h3>
          </div>
        </div>
        {announcements.length ? (
          <div className={styles.noticeList}>
            {announcements.map((announcement) => (
              <article key={announcement.id} className={styles.noticeCard}>
                <strong>{announcement.title}</strong>
                <p>{announcement.message}</p>
                <small>{formatDateTime(announcement.createdAt)}</small>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No announcements have been published yet.</p>
        )}
      </section>
    </div>
  );
}

// ── Page entry point ───────────────────────────────────────────────────────

export default async function AdminCatchAllPage({ params, searchParams }: PageProps) {
  const { slug } = await params;

  // Reject multi-segment slugs (e.g. /admin/banking/connect — now an API route)
  if (slug && slug.length > 1) notFound();

  const key = slug?.[0];

  // Unknown section slug
  if (key && !(SECTIONS as readonly string[]).includes(key)) notFound();

  const section: Section = (key as Section) ?? "dashboard";

  switch (section) {
    case "banking":
      return <BankingSection searchParams={searchParams} />;
    case "ledger":
      return <LedgerSection searchParams={searchParams} />;
    case "members":
      return <MembersSection searchParams={searchParams} />;
    case "settings":
      return <SettingsSection searchParams={searchParams} />;
    default:
      return <DashboardSection />;
  }
}
