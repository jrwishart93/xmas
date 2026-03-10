import type { Metadata } from "next";
import Link from "next/link";

import { createManualAdjustmentAction } from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.css";
import { formatDateTime, formatMoney, listLedgerEntries } from "@/lib/adminData";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Ledger",
};

function readMessage(params: Record<string, string | string[] | undefined>) {
  const success = typeof params.success === "string" ? params.success : "";
  const error = typeof params.error === "string" ? params.error : "";
  return success ? { type: "success" as const, text: success } : error ? { type: "error" as const, text: error } : null;
}

export default async function AdminLedgerPage({ searchParams }: PageProps) {
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
        <p className={`${styles.message} ${message.type === "error" ? styles.messageError : styles.messageSuccess}`}>
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
            <Link href="/admin/ledger/export/" className={styles.secondaryButton}>
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
