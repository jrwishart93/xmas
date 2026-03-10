import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME, verifySignedSession } from "@/lib/adminSession";
import { getMemberRecord } from "@/lib/isAdmin";
import { TEAM_ID } from "@/lib/team";

export async function requireAdminPageAccess() {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value || null;
  const session = await verifySignedSession(sessionCookie);

  if (!session || session.role !== "admin" || session.teamId !== TEAM_ID) {
    redirect("/");
  }

  const member = await getMemberRecord(session.uid, TEAM_ID);
  if (!member || member.disabled === true || member.role !== "admin") {
    redirect("/");
  }

  return {
    uid: session.uid,
    teamId: TEAM_ID,
    displayName: String(member.displayName || member.email || session.uid),
    email: String(member.email || ""),
    role: "admin" as const,
  };
}
