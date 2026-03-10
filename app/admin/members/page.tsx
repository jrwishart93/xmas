import type { Metadata } from "next";

import {
  changeMemberRoleAction,
  removeMemberAction,
  toggleMemberDisabledAction,
} from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.css";
import { formatDateTime, listMembers } from "@/lib/adminData";
import { requireAdminPageAccess } from "@/lib/adminAccess";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Members",
};

function readMessage(params: Record<string, string | string[] | undefined>) {
  const success = typeof params.success === "string" ? params.success : "";
  const error = typeof params.error === "string" ? params.error : "";
  return success ? { type: "success" as const, text: success } : error ? { type: "error" as const, text: error } : null;
}

export default async function AdminMembersPage({ searchParams }: PageProps) {
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
        <p className={`${styles.message} ${message.type === "error" ? styles.messageError : styles.messageSuccess}`}>
          {message.text}
        </p>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <p className={styles.eyebrow}>Directory</p>
            <h3>{members.length} active records</h3>
          </div>
          <p className={styles.panelMeta}>You cannot demote, disable, or remove your own admin record here.</p>
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
                const roleClass = member.role === "admin" ? styles.badgeAdmin : styles.badgeMember;

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
                        <span className={`${styles.badge} ${styles.badgeDisabled}`}>Disabled</span>
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
                          <form action={toggleMemberDisabledAction} className={styles.inlineForm}>
                            <input type="hidden" name="targetUid" value={member.uid} />
                            <input type="hidden" name="disabled" value={member.disabled ? "false" : "true"} />
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
