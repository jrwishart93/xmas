import { getAdminDb } from "../app/api/_lib/firebaseAdmin";
import { TEAM_ID, teamMemberPath } from "./team";

export type TeamMemberRole = "member" | "admin";

export type TeamMemberRecord = {
  displayName?: string;
  email?: string;
  role?: TeamMemberRole;
  disabled?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  disabledAt?: unknown;
  disabledBy?: string | null;
};

export async function getMemberRecord(uid: string, teamId = TEAM_ID) {
  const snapshot = await getAdminDb().doc(teamMemberPath(uid, teamId)).get();
  if (!snapshot.exists) return null;

  return {
    uid: snapshot.id,
    ...(snapshot.data() as TeamMemberRecord),
  };
}

export async function isAdmin(uid: string, teamId = TEAM_ID) {
  const member = await getMemberRecord(uid, teamId);
  if (!member) return false;

  return member.disabled !== true && member.role === "admin";
}
