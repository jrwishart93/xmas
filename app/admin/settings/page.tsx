import type { Metadata } from "next";

import { createAnnouncementAction } from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.css";
import { formatDateTime, listAnnouncements } from "@/lib/adminData";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Settings",
};

function readMessage(params: Record<string, string | string[] | undefined>) {
  const success = typeof params.success === "string" ? params.success : "";
  const error = typeof params.error === "string" ? params.error : "";
  return success ? { type: "success" as const, text: success } : error ? { type: "error" as const, text: error } : null;
}

export default async function AdminSettingsPage({ searchParams }: PageProps) {
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
        <p className={`${styles.message} ${message.type === "error" ? styles.messageError : styles.messageSuccess}`}>
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
              Create a Firebase Auth user such as <span className={styles.mono}>admin@teamsocialfund.local</span>,
              then create the member document at
              <span className={styles.mono}> teams/rpu-social-fund/members/{"{uid}"}</span> with
              <span className={styles.mono}> role: "admin"</span>.
            </p>
            <p className={styles.panelMeta}>
              The admin route tree, ledger writes, member-management actions, and banking controls all depend on that
              Firestore role.
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
