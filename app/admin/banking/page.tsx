import type { Metadata } from "next";
import Link from "next/link";

import { createManualAdjustmentAction } from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.css";
import { formatDateTime, formatMoney, getBankingSummary } from "@/lib/adminData";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Banking",
};

function readMessage(params: Record<string, string | string[] | undefined>) {
  const success = typeof params.success === "string" ? params.success : "";
  const error = typeof params.error === "string" ? params.error : "";
  return success ? { type: "success" as const, text: success } : error ? { type: "error" as const, text: error } : null;
}

function formatLiveBalance(value: number | null, currency = "GBP") {
  if (value === null) return "--";

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(value);
}

export default async function AdminBankingPage({ searchParams }: PageProps) {
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
        <p className={`${styles.message} ${message.type === "error" ? styles.messageError : styles.messageSuccess}`}>
          {message.text}
        </p>
      ) : null}

      <section className={styles.metricGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Connected Bank</span>
          <strong className={styles.metricValueSmall}>
            {banking.provider ? `${banking.provider} · ${banking.accountDisplayName || "Account"}` : "Not connected"}
          </strong>
          <p className={styles.metricMeta}>Connected at {formatDateTime(banking.connectedAt)}</p>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Live Bank Balance</span>
          <strong className={styles.metricValueSmall}>
            {formatLiveBalance(banking.liveBalance, banking.currency)}
          </strong>
          <p className={styles.metricMeta}>Last updated {formatDateTime(banking.liveBalanceUpdatedAt || banking.lastUpdated)}</p>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Recorded Fund Total</span>
          <strong className={styles.metricValue}>{formatMoney(banking.confirmedBalancePence)}</strong>
          <p className={styles.metricMeta}>Pending contributions {formatMoney(banking.pendingBalancePence)}</p>
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
              Redirect URI: <span className={styles.mono}>{banking.settings.redirectUri}</span>
            </p>
            {banking.liveBalanceError ? (
              <p className={`${styles.message} ${styles.messageError}`}>{banking.liveBalanceError}</p>
            ) : null}
            <div className={styles.buttonRow}>
              <Link href="/admin/banking/connect/" className={styles.primaryButton}>
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
          <p className={styles.panelMeta}>Recent bank transactions are represented through the fund ledger in this phase.</p>
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
